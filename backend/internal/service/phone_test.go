package service

import "testing"

func TestNormalizeMainlandPhone(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "local number", input: "13800138000", want: "+8613800138000"},
		{name: "explicit country code", input: "+8613800138000", want: "+8613800138000"},
		{name: "trim spaces", input: " 13800138000 ", want: "+8613800138000"},
		{name: "reject other country", input: "+14155552671", wantErr: true},
		{name: "reject invalid prefix", input: "12800138000", wantErr: true},
		{name: "reject separators", input: "138-0013-8000", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NormalizeMainlandPhone(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("NormalizeMainlandPhone(%q) expected error, got %q", tt.input, got)
				}
				return
			}
			if err != nil {
				t.Fatalf("NormalizeMainlandPhone(%q) error: %v", tt.input, err)
			}
			if got != tt.want {
				t.Fatalf("NormalizeMainlandPhone(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestNormalizeCaptchaTarget(t *testing.T) {
	phone, err := normalizeCaptchaTarget("phone_binding", "13800138000")
	if err != nil || phone != "+8613800138000" {
		t.Fatalf("phone target = %q, %v", phone, err)
	}

	email, err := normalizeCaptchaTarget("password_reset", " User@Example.COM ")
	if err != nil || email != "user@example.com" {
		t.Fatalf("email target = %q, %v", email, err)
	}

	if _, err := normalizeCaptchaTarget("arbitrary_action", "target"); err == nil {
		t.Fatal("expected unsupported captcha action to be rejected")
	}
}
