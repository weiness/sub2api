package service

import (
	"context"
	"strings"
	"time"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
)

var (
	ErrFAQNotFound       = infraerrors.NotFound("FAQ_NOT_FOUND", "FAQ not found")
	ErrFAQInvalidTitle   = infraerrors.BadRequest("FAQ_TITLE_INVALID", "FAQ title is required and must not exceed 200 characters")
	ErrFAQAnswerRequired = infraerrors.BadRequest("FAQ_ANSWER_REQUIRED", "FAQ answer is required")
)

type FAQ struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Answer    string    `json:"answer"`
	Enabled   bool      `json:"enabled"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type FAQListFilters struct {
	Title   string
	Enabled *bool
}

type FAQRepository interface {
	List(context.Context, pagination.PaginationParams, FAQListFilters) ([]FAQ, *pagination.PaginationResult, error)
	ListEnabled(context.Context) ([]FAQ, error)
	GetByID(context.Context, int64) (*FAQ, error)
	Create(context.Context, *FAQ) error
	Update(context.Context, *FAQ) error
	Delete(context.Context, int64) error
}

type FAQService struct{ repo FAQRepository }

func NewFAQService(repo FAQRepository) *FAQService { return &FAQService{repo: repo} }

func (s *FAQService) List(ctx context.Context, params pagination.PaginationParams, filters FAQListFilters) ([]FAQ, *pagination.PaginationResult, error) {
	filters.Title = strings.TrimSpace(filters.Title)
	return s.repo.List(ctx, params, filters)
}
func (s *FAQService) ListEnabled(ctx context.Context) ([]FAQ, error) { return s.repo.ListEnabled(ctx) }

func (s *FAQService) Create(ctx context.Context, title, answer string, enabled bool, sortOrder int) (*FAQ, error) {
	title, answer = strings.TrimSpace(title), strings.TrimSpace(answer)
	if title == "" || len([]rune(title)) > 200 {
		return nil, ErrFAQInvalidTitle
	}
	if answer == "" {
		return nil, ErrFAQAnswerRequired
	}
	item := &FAQ{Title: title, Answer: answer, Enabled: enabled, SortOrder: sortOrder}
	if err := s.repo.Create(ctx, item); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *FAQService) Update(ctx context.Context, id int64, title, answer *string, enabled *bool, sortOrder *int) (*FAQ, error) {
	item, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if title != nil {
		v := strings.TrimSpace(*title)
		if v == "" || len([]rune(v)) > 200 {
			return nil, ErrFAQInvalidTitle
		}
		item.Title = v
	}
	if answer != nil {
		v := strings.TrimSpace(*answer)
		if v == "" {
			return nil, ErrFAQAnswerRequired
		}
		item.Answer = v
	}
	if enabled != nil {
		item.Enabled = *enabled
	}
	if sortOrder != nil {
		item.SortOrder = *sortOrder
	}
	if err := s.repo.Update(ctx, item); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *FAQService) Delete(ctx context.Context, id int64) error { return s.repo.Delete(ctx, id) }
