package service

import (
	"context"
	"net/netip"
	"strings"
	"time"
)

// applyRegistrationIPPolicy attaches the trusted client IP and current limits
// only to self-service registration paths. Missing or invalid IPs fail open.
func (s *AuthService) applyRegistrationIPPolicy(ctx context.Context, user *User) {
	if user == nil || s.settingService == nil {
		return
	}
	binding := SessionBindingFromContext(ctx)
	if binding == nil {
		return
	}
	addr, err := netip.ParseAddr(strings.TrimSpace(binding.IP))
	if err != nil {
		return
	}
	limits := s.settingService.GetRegistrationIPLimits(ctx)
	limits.Now = time.Now()
	user.RegistrationIP = addr.Unmap().String()
	user.RegistrationIPLimits = limits
}
