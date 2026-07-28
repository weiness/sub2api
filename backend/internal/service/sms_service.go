package service

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math/big"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/redis/go-redis/v9"
)

var (
	ErrSMSNotConfigured = infraerrors.ServiceUnavailable("SMS_NOT_CONFIGURED", "SMS service not configured")
	ErrSMSDailyLimit    = infraerrors.TooManyRequests("SMS_DAILY_LIMIT", "daily SMS limit reached")
	ErrSMSSendFailed    = infraerrors.ServiceUnavailable("SMS_SEND_FAILED", "failed to send verification SMS")
)

type SMSVerificationData struct {
	Code      string    `json:"code"`
	Attempts  int       `json:"attempts"`
	ExpiresAt time.Time `json:"expires_at"`
}

type SMSSendResult struct {
	Countdown int    `json:"countdown"`
	RequestID string `json:"request_id,omitempty"`
}

type SMSService struct {
	settings   *SettingService
	users      UserRepository
	redis      *redis.Client
	httpClient *http.Client
}

func NewSMSService(settings *SettingService, users UserRepository, redisClient *redis.Client) *SMSService {
	return &SMSService{settings: settings, users: users, redis: redisClient, httpClient: &http.Client{Timeout: 10 * time.Second}}
}

const (
	smsPurposeRegistration = "registration"
	smsPurposeBinding      = "binding"
)

func smsCodeKey(purpose, phone string) string { return "sms:verify:" + purpose + ":" + phone }
func smsCooldownKey(phone string) string      { return "sms:cooldown:" + phone }
func smsInflightKey(phone string) string      { return "sms:inflight:" + phone }
func smsDailyKey(phone string, now time.Time) string {
	return "sms:daily:" + now.Format("20060102") + ":" + phone
}

func generateSMSCode() (string, error) {
	code := make([]byte, 6)
	for i := range code {
		n, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		code[i] = byte('0' + n.Int64())
	}
	return string(code), nil
}

func (s *SMSService) SendRegistrationCode(ctx context.Context, rawPhone string) (*SMSSendResult, error) {
	phone, err := NormalizeMainlandPhone(rawPhone)
	if err != nil {
		return nil, err
	}
	if s.settings == nil || !s.settings.IsSMSVerificationEnabled(ctx) {
		return nil, ErrSMSNotConfigured
	}
	exists, err := phoneExists(ctx, s.users, phone, 0)
	if err != nil {
		return nil, ErrServiceUnavailable
	}
	if exists {
		return nil, ErrPhoneExists
	}
	return s.sendCode(ctx, smsPurposeRegistration, phone)
}

func (s *SMSService) SendBindingCode(ctx context.Context, userID int64, rawPhone string) (*SMSSendResult, error) {
	phone, err := NormalizeMainlandPhone(rawPhone)
	if err != nil {
		return nil, err
	}
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user.Phone != nil {
		return nil, ErrPhoneExists
	}
	exists, err := phoneExists(ctx, s.users, phone, userID)
	if err != nil {
		return nil, ErrServiceUnavailable
	}
	if exists {
		return nil, ErrPhoneExists
	}
	return s.sendCode(ctx, smsPurposeBinding, phone)
}

func (s *SMSService) sendCode(ctx context.Context, purpose, phone string) (*SMSSendResult, error) {
	ttlMinutes, cooldownSeconds, dailyLimit, _, channels := s.settings.GetSMSSettings(ctx)
	if len(channels) == 0 {
		return nil, ErrSMSNotConfigured
	}
	if s.redis == nil {
		return nil, ErrServiceUnavailable
	}
	if n, _ := s.redis.Exists(ctx, smsCooldownKey(phone)).Result(); n > 0 {
		return nil, ErrVerifyCodeTooFrequent
	}
	now := time.Now()
	if count, _ := s.redis.Get(ctx, smsDailyKey(phone, now)).Int(); count >= dailyLimit {
		return nil, ErrSMSDailyLimit
	}
	locked, err := s.redis.SetNX(ctx, smsInflightKey(phone), "1", 20*time.Second).Result()
	if err != nil || !locked {
		return nil, ErrVerifyCodeTooFrequent
	}
	defer s.redis.Del(context.Background(), smsInflightKey(phone))

	code, err := generateSMSCode()
	if err != nil {
		return nil, err
	}
	requestID, err := s.sendThroughChannels(ctx, phone, code, ttlMinutes, channels)
	if err != nil {
		return nil, err
	}

	expiresAt := now.Add(time.Duration(ttlMinutes) * time.Minute)
	payload, _ := json.Marshal(SMSVerificationData{Code: code, ExpiresAt: expiresAt})
	pipe := s.redis.TxPipeline()
	pipe.Set(ctx, smsCodeKey(purpose, phone), payload, time.Duration(ttlMinutes)*time.Minute)
	pipe.Set(ctx, smsCooldownKey(phone), "1", time.Duration(cooldownSeconds)*time.Second)
	daily := pipe.Incr(ctx, smsDailyKey(phone, now))
	pipe.Expire(ctx, smsDailyKey(phone, now), 48*time.Hour)
	if _, err := pipe.Exec(ctx); err != nil {
		return nil, ErrServiceUnavailable
	}
	if daily.Val() > int64(dailyLimit) {
		slog.Warn("SMS daily success count exceeded configured limit after provider success", "phone_suffix", phone[len(phone)-4:])
	}
	return &SMSSendResult{Countdown: cooldownSeconds, RequestID: requestID}, nil
}

func (s *SMSService) VerifyRegistrationCode(ctx context.Context, rawPhone, code string) error {
	return s.verifyCode(ctx, smsPurposeRegistration, rawPhone, code)
}

func (s *SMSService) VerifyBindingCode(ctx context.Context, rawPhone, code string) error {
	return s.verifyCode(ctx, smsPurposeBinding, rawPhone, code)
}

func (s *SMSService) verifyCode(ctx context.Context, purpose, rawPhone, code string) error {
	phone, err := NormalizeMainlandPhone(rawPhone)
	if err != nil {
		return err
	}
	_, _, _, maxAttempts, _ := s.settings.GetSMSSettings(ctx)
	key := smsCodeKey(purpose, phone)
	raw, err := s.redis.Get(ctx, key).Bytes()
	if err != nil {
		return ErrInvalidVerifyCode
	}
	var data SMSVerificationData
	if json.Unmarshal(raw, &data) != nil || time.Now().After(data.ExpiresAt) {
		return ErrInvalidVerifyCode
	}
	if data.Attempts >= maxAttempts {
		return ErrVerifyCodeMaxAttempts
	}
	if subtle.ConstantTimeCompare([]byte(data.Code), []byte(strings.TrimSpace(code))) != 1 {
		data.Attempts++
		remaining := time.Until(data.ExpiresAt)
		if remaining > 0 {
			encoded, _ := json.Marshal(data)
			_ = s.redis.Set(ctx, key, encoded, remaining).Err()
		}
		if data.Attempts >= maxAttempts {
			return ErrVerifyCodeMaxAttempts
		}
		return ErrInvalidVerifyCode
	}
	return s.redis.Del(ctx, key).Err()
}

func (s *SMSService) sendThroughChannels(ctx context.Context, phone, code string, ttlMinutes int, configured []SMSChannelConfig) (string, error) {
	channels := make([]SMSChannelConfig, 0, len(configured))
	for _, channel := range configured {
		if channel.Enabled && channel.Provider == "spug" && strings.TrimSpace(channel.TemplateID) != "" {
			channels = append(channels, channel)
		}
	}
	if len(channels) == 0 {
		return "", ErrSMSNotConfigured
	}
	start, _ := s.redis.Incr(ctx, "sms:channel:round_robin").Result()
	for offset := 0; offset < len(channels); offset++ {
		channel := channels[(int(start-1)+offset)%len(channels)]
		requestID, explicitFailure, err := s.sendSpug(ctx, channel, phone, code, ttlMinutes)
		if err == nil {
			return requestID, nil
		}
		if !explicitFailure {
			return "", ErrSMSSendFailed
		}
		slog.Warn("SMS channel explicitly rejected request; trying next channel", "channel_id", channel.ID, "error", err)
	}
	return "", ErrSMSSendFailed
}

type spugResponse struct {
	Code      int    `json:"code"`
	Msg       string `json:"msg"`
	RequestID string `json:"request_id"`
}

func (s *SMSService) sendSpug(ctx context.Context, channel SMSChannelConfig, phone, code string, ttlMinutes int) (string, bool, error) {
	endpoint := "https://push.spug.cc/sms/" + url.PathEscape(strings.TrimSpace(channel.TemplateID))
	query := url.Values{"to": []string{phone}}
	for _, variable := range channel.Variables {
		name := strings.TrimSpace(variable.Name)
		if !smsConfigVariableNamePattern.MatchString(name) || strings.EqualFold(name, "to") {
			return "", true, fmt.Errorf("invalid SMS variable name")
		}
		value := strings.NewReplacer("{{code}}", code, "{{ttl_minutes}}", strconv.Itoa(ttlMinutes), "{{phone}}", phone).Replace(variable.Value)
		query.Set(name, value)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint+"?"+query.Encode(), nil)
	if err != nil {
		return "", true, err
	}
	resp, err := s.httpClient.Do(req)
	if err != nil {
		var netErr net.Error
		if errors.As(err, &netErr) && netErr.Timeout() {
			return "", false, err
		}
		return "", false, err
	}
	defer resp.Body.Close()
	var result spugResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, 64<<10)).Decode(&result); err != nil {
		return "", true, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 || result.Code != 200 {
		return result.RequestID, true, fmt.Errorf("provider rejected request: http=%d code=%d msg=%s", resp.StatusCode, result.Code, result.Msg)
	}
	return result.RequestID, false, nil
}

func (s *SMSService) TestSend(ctx context.Context, channel SMSChannelConfig, rawPhone string) (*SMSSendResult, error) {
	if err := ValidateSMSChannelConfig(channel, false); err != nil || strings.TrimSpace(channel.TemplateID) == "" {
		return nil, infraerrors.BadRequest("INVALID_SMS_CHANNEL", "invalid SMS channel configuration")
	}
	phone, err := NormalizeMainlandPhone(rawPhone)
	if err != nil {
		return nil, err
	}
	ttl, _, _, _, _ := s.settings.GetSMSSettings(ctx)
	requestID, _, err := s.sendSpug(ctx, channel, phone, "123456", ttl)
	if err != nil {
		return nil, ErrSMSSendFailed
	}
	return &SMSSendResult{RequestID: requestID}, nil
}
