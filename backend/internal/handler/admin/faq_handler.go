package admin

import (
	"strconv"
	"strings"

	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

type FAQHandler struct{ service *service.FAQService }

func NewFAQHandler(faqService *service.FAQService) *FAQHandler {
	return &FAQHandler{service: faqService}
}

type createFAQRequest struct {
	Title     string `json:"title" binding:"required"`
	Answer    string `json:"answer" binding:"required"`
	Enabled   bool   `json:"enabled"`
	SortOrder int    `json:"sort_order"`
}

type updateFAQRequest struct {
	Title     *string `json:"title"`
	Answer    *string `json:"answer"`
	Enabled   *bool   `json:"enabled"`
	SortOrder *int    `json:"sort_order"`
}

func (h *FAQHandler) List(c *gin.Context) {
	page, pageSize := response.ParsePagination(c)
	title := strings.TrimSpace(c.Query("title"))
	if len([]rune(title)) > 200 {
		response.BadRequest(c, "FAQ title filter must not exceed 200 characters")
		return
	}

	var enabled *bool
	if raw := strings.TrimSpace(c.Query("enabled")); raw != "" {
		value, err := strconv.ParseBool(raw)
		if err != nil {
			response.BadRequest(c, "Invalid enabled filter")
			return
		}
		enabled = &value
	}

	items, result, err := h.service.List(c.Request.Context(), pagination.PaginationParams{
		Page: page, PageSize: pageSize,
	}, service.FAQListFilters{Title: title, Enabled: enabled})
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Paginated(c, items, result.Total, page, pageSize)
}

func (h *FAQHandler) Create(c *gin.Context) {
	var req createFAQRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	item, err := h.service.Create(c.Request.Context(), req.Title, req.Answer, req.Enabled, req.SortOrder)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, item)
}

func (h *FAQHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		response.BadRequest(c, "Invalid FAQ ID")
		return
	}
	var req updateFAQRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	item, err := h.service.Update(c.Request.Context(), id, req.Title, req.Answer, req.Enabled, req.SortOrder)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, item)
}

func (h *FAQHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		response.BadRequest(c, "Invalid FAQ ID")
		return
	}
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"message": "ok"})
}
