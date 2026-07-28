package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"sort"
	"strings"
	"time"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/golang/freetype/truetype"
	"github.com/redis/go-redis/v9"
	"github.com/wenlng/go-captcha-assets/bindata/chars"
	"github.com/wenlng/go-captcha-assets/resources/fonts/fzshengsksjw"
	"github.com/wenlng/go-captcha-assets/resources/imagesv2"
	assettiles "github.com/wenlng/go-captcha-assets/resources/tiles"
	"github.com/wenlng/go-captcha/v2/base/option"
	"github.com/wenlng/go-captcha/v2/click"
	"github.com/wenlng/go-captcha/v2/rotate"
	"github.com/wenlng/go-captcha/v2/slide"
)

type CaptchaPoint struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type CaptchaChallengeResponse struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	Image       string `json:"image"`
	Thumb       string `json:"thumb"`
	ThumbX      int    `json:"thumb_x,omitempty"`
	ThumbY      int    `json:"thumb_y,omitempty"`
	ThumbWidth  int    `json:"thumb_width,omitempty"`
	ThumbHeight int    `json:"thumb_height,omitempty"`
	ThumbSize   int    `json:"thumb_size,omitempty"`
}

type CaptchaAnswer struct {
	X     int            `json:"x"`
	Y     int            `json:"y"`
	Angle int            `json:"angle"`
	Dots  []CaptchaPoint `json:"dots"`
}

type captchaStoredChallenge struct {
	Type     string         `json:"type"`
	Action   string         `json:"action"`
	Target   string         `json:"target"`
	IP       string         `json:"ip"`
	X        int            `json:"x"`
	Y        int            `json:"y"`
	Width    int            `json:"width"`
	Height   int            `json:"height"`
	Angle    int            `json:"angle"`
	Dots     []CaptchaPoint `json:"dots"`
	DotSizes []CaptchaPoint `json:"dot_sizes"`
}

type captchaProof struct {
	Action string `json:"action"`
	Target string `json:"target"`
	IP     string `json:"ip"`
}

type GraphicalCaptchaService struct {
	settings *SettingService
	redis    *redis.Client
	slide    slide.Captcha
	region   slide.Captcha
	rotate   rotate.Captcha
	click    click.Captcha
}

func NewGraphicalCaptchaService(settings *SettingService, redisClient *redis.Client) (*GraphicalCaptchaService, error) {
	backgrounds, err := imagesv2.GetImages()
	if err != nil {
		return nil, err
	}
	tiles, err := assettiles.GetTiles()
	if err != nil {
		return nil, err
	}
	graphs := make([]*slide.GraphImage, 0, len(tiles))
	for _, tile := range tiles {
		graphs = append(graphs, &slide.GraphImage{OverlayImage: tile.OverlayImage, ShadowImage: tile.ShadowImage, MaskImage: tile.MaskImage})
	}
	slideBuilder := slide.NewBuilder()
	slideBuilder.SetResources(slide.WithGraphImages(graphs), slide.WithBackgrounds(backgrounds))
	regionBuilder := slide.NewBuilder()
	regionBuilder.SetResources(slide.WithGraphImages(graphs), slide.WithBackgrounds(backgrounds))
	rotateBuilder := rotate.NewBuilder()
	rotateBuilder.SetResources(rotate.WithImages(backgrounds))
	font, err := fzshengsksjw.GetFont()
	if err != nil {
		return nil, err
	}
	clickBuilder := click.NewBuilder(click.WithRangeLen(option.RangeVal{Min: 4, Max: 5}), click.WithRangeVerifyLen(option.RangeVal{Min: 3, Max: 3}))
	clickBuilder.SetResources(click.WithChars(chars.GetChineseChars()), click.WithFonts([]*truetype.Font{font}), click.WithBackgrounds(backgrounds))
	return &GraphicalCaptchaService{settings: settings, redis: redisClient, slide: slideBuilder.Make(), region: regionBuilder.MakeWithRegion(), rotate: rotateBuilder.Make(), click: clickBuilder.Make()}, nil
}

func randomCaptchaToken() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
func captchaChallengeKey(id string) string { return "captcha:challenge:" + id }
func captchaProofKey(id string) string     { return "captcha:proof:" + id }

func normalizeCaptchaTarget(action, target string) (string, error) {
	switch action {
	case "login", "register", "registration_email", "registration_sms", "password_reset", "phone_binding":
	default:
		return "", infraerrors.BadRequest("INVALID_CAPTCHA_ACTION", "invalid captcha action")
	}
	target = strings.TrimSpace(target)
	if action == "registration_sms" || action == "phone_binding" {
		return NormalizeMainlandPhone(target)
	}
	return strings.ToLower(target), nil
}

func (s *GraphicalCaptchaService) Create(ctx context.Context, action, target, remoteIP string) (*CaptchaChallengeResponse, error) {
	enabled, provider, captchaType := s.settings.GetBotProtection(ctx)
	if !enabled || provider != BotProtectionGraphical {
		return nil, ErrTurnstileNotConfigured
	}
	target, err := normalizeCaptchaTarget(action, target)
	if err != nil {
		return nil, err
	}
	id, err := randomCaptchaToken()
	if err != nil {
		return nil, err
	}
	stored := captchaStoredChallenge{Type: captchaType, Action: action, Target: target, IP: remoteIP}
	response := &CaptchaChallengeResponse{ID: id, Type: captchaType}
	switch captchaType {
	case "rotate":
		data, err := s.rotate.Generate()
		if err != nil {
			return nil, err
		}
		block := data.GetData()
		stored.Angle = block.Angle
		response.Image, err = data.GetMasterImage().ToBase64()
		if err != nil {
			return nil, err
		}
		response.Thumb, err = data.GetThumbImage().ToBase64()
		if err != nil {
			return nil, err
		}
		response.ThumbSize = block.Width
	case "click":
		data, err := s.click.Generate()
		if err != nil {
			return nil, err
		}
		keys := make([]int, 0, len(data.GetData()))
		for key := range data.GetData() {
			keys = append(keys, key)
		}
		sort.Ints(keys)
		for _, key := range keys {
			dot := data.GetData()[key]
			stored.Dots = append(stored.Dots, CaptchaPoint{X: dot.X, Y: dot.Y})
			stored.DotSizes = append(stored.DotSizes, CaptchaPoint{X: dot.Width, Y: dot.Height})
		}
		response.Image, err = data.GetMasterImage().ToBase64()
		if err != nil {
			return nil, err
		}
		response.Thumb, err = data.GetThumbImage().ToBase64()
		if err != nil {
			return nil, err
		}
	default:
		generator := s.slide
		if captchaType == "drag" {
			generator = s.region
		}
		data, err := generator.Generate()
		if err != nil {
			return nil, err
		}
		block := data.GetData()
		stored.X, stored.Y, stored.Width, stored.Height = block.X, block.Y, block.Width, block.Height
		response.Image, err = data.GetMasterImage().ToBase64()
		if err != nil {
			return nil, err
		}
		response.Thumb, err = data.GetTileImage().ToBase64()
		if err != nil {
			return nil, err
		}
		response.ThumbX, response.ThumbY = block.DX, block.DY
		response.ThumbWidth, response.ThumbHeight = block.Width, block.Height
	}
	payload, _ := json.Marshal(stored)
	if err := s.redis.Set(ctx, captchaChallengeKey(id), payload, 2*time.Minute).Err(); err != nil {
		return nil, err
	}
	return response, nil
}

func (s *GraphicalCaptchaService) Verify(ctx context.Context, id string, answer CaptchaAnswer, remoteIP string) (string, error) {
	key := captchaChallengeKey(strings.TrimSpace(id))
	raw, err := s.redis.GetDel(ctx, key).Bytes()
	if err != nil {
		return "", ErrInvalidVerifyCode
	}
	var stored captchaStoredChallenge
	if json.Unmarshal(raw, &stored) != nil || stored.IP != remoteIP {
		return "", ErrInvalidVerifyCode
	}
	valid := false
	switch stored.Type {
	case "rotate":
		valid = rotate.Validate(answer.Angle, stored.Angle, 6)
	case "click":
		valid = len(answer.Dots) == len(stored.Dots)
		if valid {
			for i := range stored.Dots {
				if !click.Validate(answer.Dots[i].X, answer.Dots[i].Y, stored.Dots[i].X, stored.Dots[i].Y, stored.DotSizes[i].X, stored.DotSizes[i].Y, 8) {
					valid = false
					break
				}
			}
		}
	default:
		valid = slide.Validate(answer.X, answer.Y, stored.X, stored.Y, 6)
	}
	if !valid {
		return "", ErrInvalidVerifyCode
	}
	proofID, err := randomCaptchaToken()
	if err != nil {
		return "", err
	}
	proofRaw, _ := json.Marshal(captchaProof{Action: stored.Action, Target: stored.Target, IP: stored.IP})
	if err := s.redis.Set(ctx, captchaProofKey(proofID), proofRaw, 2*time.Minute).Err(); err != nil {
		return "", err
	}
	return proofID, nil
}

func (s *GraphicalCaptchaService) ConsumeProof(ctx context.Context, proofID, action, target, remoteIP string) error {
	target, err := normalizeCaptchaTarget(action, target)
	if err != nil {
		return err
	}
	raw, err := s.redis.GetDel(ctx, captchaProofKey(strings.TrimSpace(proofID))).Bytes()
	if err != nil {
		return ErrInvalidVerifyCode
	}
	var proof captchaProof
	if json.Unmarshal(raw, &proof) != nil || proof.Action != action || proof.Target != target || proof.IP != remoteIP {
		return ErrInvalidVerifyCode
	}
	return nil
}
