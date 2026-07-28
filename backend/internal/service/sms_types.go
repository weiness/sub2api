package service

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

var smsConfigVariableNamePattern = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9_]{0,63}$`)

const (
	RegistrationVerificationEmail = "email"
	RegistrationVerificationSMS   = "sms"
	BotProtectionTurnstile        = "turnstile"
	BotProtectionGraphical        = "graphical"
)

type SMSVariable struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type SMSChannelConfig struct {
	ID         string        `json:"id"`
	Name       string        `json:"name"`
	Provider   string        `json:"provider"`
	Enabled    bool          `json:"enabled"`
	TemplateID string        `json:"template_id,omitempty"`
	Variables  []SMSVariable `json:"variables"`
}

func ValidateSMSChannelConfig(channel SMSChannelConfig, requireEnabled bool) error {
	if channel.Provider != "spug" {
		return fmt.Errorf("unsupported SMS provider")
	}
	if requireEnabled && !channel.Enabled {
		return fmt.Errorf("SMS channel is disabled")
	}
	if (channel.Enabled || requireEnabled) && strings.TrimSpace(channel.TemplateID) == "" {
		return fmt.Errorf("SMS template ID is required")
	}
	seen := make(map[string]struct{}, len(channel.Variables))
	for _, variable := range channel.Variables {
		name := strings.TrimSpace(variable.Name)
		if !smsConfigVariableNamePattern.MatchString(name) || strings.EqualFold(name, "to") {
			return fmt.Errorf("invalid SMS variable name %q", name)
		}
		key := strings.ToLower(name)
		if _, exists := seen[key]; exists {
			return fmt.Errorf("duplicate SMS variable name %q", name)
		}
		seen[key] = struct{}{}
	}
	return nil
}

func normalizeRegistrationVerificationType(value string) string {
	if strings.EqualFold(strings.TrimSpace(value), RegistrationVerificationSMS) {
		return RegistrationVerificationSMS
	}
	return RegistrationVerificationEmail
}

func normalizeBotProtectionProvider(value string) string {
	if strings.EqualFold(strings.TrimSpace(value), BotProtectionGraphical) {
		return BotProtectionGraphical
	}
	return BotProtectionTurnstile
}

func normalizeGraphicalCaptchaType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "drag", "rotate", "click":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "slide"
	}
}

func positiveIntOrDefault(raw string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func parseSMSChannels(raw string) []SMSChannelConfig {
	var channels []SMSChannelConfig
	if json.Unmarshal([]byte(raw), &channels) != nil || channels == nil {
		return []SMSChannelConfig{}
	}
	return channels
}

func registrationVerificationEnabled(settings map[string]string) bool {
	if value, ok := settings[SettingKeyRegistrationVerificationEnabled]; ok {
		return value == "true"
	}
	return settings[SettingKeyEmailVerifyEnabled] == "true"
}

func registrationVerificationType(settings map[string]string) string {
	if _, ok := settings[SettingKeyRegistrationVerificationType]; !ok {
		return RegistrationVerificationEmail
	}
	return normalizeRegistrationVerificationType(settings[SettingKeyRegistrationVerificationType])
}

func botProtectionEnabled(settings map[string]string) bool {
	if value, ok := settings[SettingKeyBotProtectionEnabled]; ok {
		return value == "true"
	}
	return settings[SettingKeyTurnstileEnabled] == "true"
}

func botProtectionProvider(settings map[string]string) string {
	if _, ok := settings[SettingKeyBotProtectionProvider]; !ok {
		return BotProtectionTurnstile
	}
	return normalizeBotProtectionProvider(settings[SettingKeyBotProtectionProvider])
}
