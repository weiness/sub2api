package handler

import (
	"log/slog"
	"strings"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
)

// ModelPlazaHandler 处理「模型广场」查询。
//
// 广场路由挂 OptionalJWT 中间件：匿名可访问（除非 require_auth 开启），带 token 则
// 识别用户。可见性规则：
//   - 匿名：仅返回非专属分组中的模型目录，不返回任何分组信息；
//   - 登录：复用 API Key 可绑定分组规则，仅返回用户当前实际可用的分组。
type ModelPlazaHandler struct {
	channelService *service.ChannelService
	apiKeyService  *service.APIKeyService
	settingService *service.SettingService
}

// NewModelPlazaHandler 创建模型广场 handler。
func NewModelPlazaHandler(
	channelService *service.ChannelService,
	apiKeyService *service.APIKeyService,
	settingService *service.SettingService,
) *ModelPlazaHandler {
	return &ModelPlazaHandler{
		channelService: channelService,
		apiKeyService:  apiKeyService,
		settingService: settingService,
	}
}

// modelPlazaOfficialPricing LiteLLM 官方参考价（USD per token）。
type modelPlazaOfficialPricing struct {
	InputPrice        *float64 `json:"input_price"`
	OutputPrice       *float64 `json:"output_price"`
	CacheWritePrice   *float64 `json:"cache_write_price"`
	CacheWrite1hPrice *float64 `json:"cache_write_1h_price,omitempty"`
	CacheReadPrice    *float64 `json:"cache_read_price"`
}

// modelPlazaModel 广场模型条目：渠道定价（白名单形态）+ 官方参考价。
type modelPlazaModel struct {
	Name             string                     `json:"name"`
	Platform         string                     `json:"platform"`
	Pricing          *userSupportedModelPricing `json:"pricing"`
	OfficialPricing  *modelPlazaOfficialPricing `json:"official_pricing"`
	Modalities       []string                   `json:"modalities"`
	OutputModalities []string                   `json:"output_modalities"`
	Capabilities     []string                   `json:"capabilities"`
}

// modelPlazaGroup 广场分组条目（白名单字段）。
type modelPlazaGroup struct {
	ID                   int64             `json:"id"`
	Name                 string            `json:"name"`
	Description          string            `json:"description"`
	Platform             string            `json:"platform"`
	SubscriptionType     string            `json:"subscription_type"`
	RateMultiplier       float64           `json:"rate_multiplier"`
	UserRateMultiplier   *float64          `json:"user_rate_multiplier,omitempty"`
	PeakRateEnabled      bool              `json:"peak_rate_enabled"`
	PeakStart            string            `json:"peak_start"`
	PeakEnd              string            `json:"peak_end"`
	PeakRateMultiplier   float64           `json:"peak_rate_multiplier"`
	IsExclusive          bool              `json:"is_exclusive"`
	AllowImageGeneration bool              `json:"allow_image_generation"`
	ImageRateIndependent bool              `json:"image_rate_independent"`
	ImageRateMultiplier  float64           `json:"image_rate_multiplier"`
	ImagePrice1K         *float64          `json:"image_price_1k"`
	ImagePrice2K         *float64          `json:"image_price_2k"`
	ImagePrice4K         *float64          `json:"image_price_4k"`
	Models               []modelPlazaModel `json:"models"`
}

// modelPlazaResponse 广场页响应。
type modelPlazaResponse struct {
	Description   string            `json:"description"`
	Authenticated bool              `json:"authenticated"`
	Models        []modelPlazaModel `json:"models"`
	Groups        []modelPlazaGroup `json:"groups"`
}

// Get 返回模型广场数据。
// GET /api/v1/model-plaza
func (h *ModelPlazaHandler) Get(c *gin.Context) {
	if h.settingService == nil {
		response.NotFound(c, "Model plaza is not enabled")
		return
	}
	rt := h.settingService.GetModelPlazaRuntime(c.Request.Context())
	if !rt.Enabled {
		response.NotFound(c, "Model plaza is not enabled")
		return
	}

	subject, authed := middleware.GetAuthSubjectFromContext(c)
	if rt.RequireAuth && !authed {
		response.Unauthorized(c, "Authentication required")
		return
	}

	groups, err := h.channelService.ListPlazaGroups(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	if !authed {
		response.Success(c, modelPlazaResponse{
			Description:   rt.Description,
			Authenticated: false,
			Models:        toAnonymousModelCatalog(filterPlazaVisibleGroups(groups, nil)),
			Groups:        []modelPlazaGroup{},
		})
		return
	}

	// 复用「可用渠道」的分组口径，包含普通分组、专属授权和有效订阅判断。
	var allowedGroups map[int64]struct{}
	var userRates map[int64]float64
	if authed {
		availableGroups, availableErr := h.apiKeyService.GetAvailableGroups(c.Request.Context(), subject.UserID)
		err = availableErr
		if err != nil {
			// 可见性数据拿不到时不能静默扩大范围，直接报错。
			response.ErrorFrom(c, err)
			return
		}
		allowedGroups = make(map[int64]struct{}, len(availableGroups))
		for i := range availableGroups {
			allowedGroups[availableGroups[i].ID] = struct{}{}
		}
		userRates, err = h.apiKeyService.GetUserGroupRates(c.Request.Context(), subject.UserID)
		if err != nil {
			// 专属倍率仅是展示增强，失败降级为分组默认倍率。
			slog.Warn("model_plaza_user_rates_failed", "error", err, "user_id", subject.UserID)
			userRates = nil
		}
	}

	visible := filterPlazaVisibleGroups(groups, allowedGroups)

	out := make([]modelPlazaGroup, 0, len(visible))
	for i := range visible {
		out = append(out, toModelPlazaGroupDTO(&visible[i], userRates))
	}
	response.Success(c, modelPlazaResponse{
		Description:   rt.Description,
		Authenticated: true,
		Models:        []modelPlazaModel{},
		Groups:        out,
	})
}

// toAnonymousModelCatalog 将公开分组中的模型去重为匿名目录。返回值不包含任何
// 分组标识或倍率；同名模型按 ListPlazaGroups 的稳定顺序取首个条目。
func toAnonymousModelCatalog(groups []service.PlazaGroup) []modelPlazaModel {
	models := make([]modelPlazaModel, 0)
	seen := make(map[string]struct{})
	for i := range groups {
		for j := range groups[i].Models {
			model := &groups[i].Models[j]
			key := strings.ToLower(strings.TrimSpace(model.Name))
			if key == "" {
				continue
			}
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			models = append(models, toModelPlazaModelDTO(model))
		}
	}
	return models
}

// filterPlazaVisibleGroups 按登录态裁剪分组可见性。
// allowed == nil 表示匿名目录（仅取非专属分组作为模型来源）；非 nil 表示登录，
// 仅保留 GetAvailableGroups 判定为用户当前可用的分组。
func filterPlazaVisibleGroups(
	groups []service.PlazaGroup,
	allowed map[int64]struct{},
) []service.PlazaGroup {
	visible := make([]service.PlazaGroup, 0, len(groups))
	for _, g := range groups {
		if allowed == nil {
			if !g.IsExclusive {
				visible = append(visible, g)
			}
			continue
		}
		if _, ok := allowed[g.ID]; !ok {
			continue
		}
		visible = append(visible, g)
	}
	return visible
}

// toModelPlazaGroupDTO 将 service 层广场分组映射为白名单 DTO,并合并用户专属倍率。
func toModelPlazaGroupDTO(g *service.PlazaGroup, userRates map[int64]float64) modelPlazaGroup {
	models := make([]modelPlazaModel, 0, len(g.Models))
	for i := range g.Models {
		models = append(models, toModelPlazaModelDTO(&g.Models[i]))
	}
	dto := modelPlazaGroup{
		ID:                   g.ID,
		Name:                 g.Name,
		Description:          g.Description,
		Platform:             g.Platform,
		SubscriptionType:     g.SubscriptionType,
		RateMultiplier:       g.RateMultiplier,
		PeakRateEnabled:      g.PeakRateEnabled,
		PeakStart:            g.PeakStart,
		PeakEnd:              g.PeakEnd,
		PeakRateMultiplier:   g.PeakRateMultiplier,
		IsExclusive:          g.IsExclusive,
		AllowImageGeneration: g.AllowImageGeneration,
		ImageRateIndependent: g.ImageRateIndependent,
		ImageRateMultiplier:  g.ImageRateMultiplier,
		ImagePrice1K:         g.ImagePrice1K,
		ImagePrice2K:         g.ImagePrice2K,
		ImagePrice4K:         g.ImagePrice4K,
		Models:               models,
	}
	if rate, ok := userRates[g.ID]; ok {
		dto.UserRateMultiplier = &rate
	}
	return dto
}

func toModelPlazaModelDTO(m *service.PlazaModel) modelPlazaModel {
	return modelPlazaModel{
		Name:             m.Name,
		Platform:         m.Platform,
		Pricing:          toUserPricing(m.Pricing),
		OfficialPricing:  toModelPlazaOfficialPricing(m.OfficialPricing),
		Modalities:       append([]string(nil), m.Modalities...),
		OutputModalities: append([]string(nil), m.OutputModalities...),
		Capabilities:     append([]string(nil), m.Capabilities...),
	}
}

// toModelPlazaOfficialPricing 转换官方参考价；nil 透传（前端显示 "-"）。
func toModelPlazaOfficialPricing(p *service.PlazaOfficialPricing) *modelPlazaOfficialPricing {
	if p == nil {
		return nil
	}
	return &modelPlazaOfficialPricing{
		InputPrice:        p.InputPrice,
		OutputPrice:       p.OutputPrice,
		CacheWritePrice:   p.CacheWritePrice,
		CacheWrite1hPrice: p.CacheWrite1hPrice,
		CacheReadPrice:    p.CacheReadPrice,
	}
}
