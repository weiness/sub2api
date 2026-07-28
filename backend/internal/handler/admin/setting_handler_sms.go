package admin

import (
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

type TestSMSRequest struct {
	Phone   string                   `json:"phone" binding:"required"`
	Channel service.SMSChannelConfig `json:"channel" binding:"required"`
}

func (h *SettingHandler) TestSMS(c *gin.Context) {
	var req TestSMSRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}
	if h.smsService == nil {
		response.ErrorFrom(c, service.ErrSMSNotConfigured)
		return
	}
	result, err := h.smsService.TestSend(c.Request.Context(), req.Channel, req.Phone)
	if err != nil {
		response.ErrorFrom(c, err)
		return
	}
	response.Success(c, gin.H{"message": "SMS sent successfully", "request_id": result.RequestID})
}
