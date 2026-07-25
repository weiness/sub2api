package handler

import (
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

type FAQHandler struct{ service *service.FAQService }

func NewFAQHandler(faqService *service.FAQService) *FAQHandler {
	return &FAQHandler{service: faqService}
}

// List returns enabled FAQs for anonymous home-page visitors.
func (h *FAQHandler) List(c *gin.Context) {
	items, err := h.service.ListEnabled(c.Request.Context())
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, items)
}
