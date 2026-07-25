import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createPinia } from "pinia";
import { createI18n } from "vue-i18n";
import type { SubscriptionPlan } from "@/types/payment";
import SubscriptionPlanCard from "../SubscriptionPlanCard.vue";
import HelpTooltip from "@/components/common/HelpTooltip.vue";

const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackWarn: false,
  missingWarn: false,
  messages: {
    en: {
      payment: {
        days: "days",
        weeks: "weeks",
        months: "months",
        perMonth: "month",
        models: "Models",
        planCard: {
          quota: "Quota",
          rate: "Rate",
          peakRate: "Peak Rate",
          unlimited: "Unlimited",
        },
        subscribeNow: "Subscribe now",
      },
    },
  },
});

const mountPlanCard = (groupPlatform: string, overrides: Partial<SubscriptionPlan> = {}) =>
  mount(SubscriptionPlanCard, {
    props: {
      plan: {
        id: 1,
        group_id: 10,
        group_platform: groupPlatform,
        name: "Pro",
        price: 10,
        amount: 1000,
        features: [],
        rate_multiplier: 1,
        validity_days: 30,
        validity_unit: "day",
        supported_model_scopes: ["claude", "gemini_text", "gemini_image"],
        is_active: true,
        recommended: false,
        ...overrides,
      },
    },
    global: { plugins: [i18n, createPinia()] },
  });

describe("SubscriptionPlanCard", () => {
  it("does not show Antigravity model scopes for OpenAI plans", () => {
    const text = mountPlanCard("openai").text();

    expect(text).not.toContain("Claude");
    expect(text).not.toContain("Gemini");
    expect(text).not.toContain("Imagen");
  });

  it("shows model scopes for Antigravity plans", () => {
    const text = mountPlanCard("antigravity").text();

    expect(text).toContain("Claude");
    expect(text).toContain("Gemini");
    expect(text).toContain("Imagen");
  });

  // #4607：管理端保存的单位是复数（months/weeks），此前用户侧只匹配单数
  // 'month'，「1 个月」的套餐卡片被显示成「1天」。测试环境的 vue-i18n 为
  // runtime-only 构建，t() 原样返回 key，故按 key 断言单位分支。
  it("renders plural admin-form validity units instead of mislabeled days (#4607)", () => {
    expect(mountPlanCard("openai", { validity_days: 1, validity_unit: "months" }).text()).toContain("/ payment.perMonth");
    expect(mountPlanCard("openai", { validity_days: 3, validity_unit: "months" }).text()).toContain("/ 3payment.months");
    expect(mountPlanCard("openai", { validity_days: 2, validity_unit: "weeks" }).text()).toContain("/ 2payment.weeks");
    expect(mountPlanCard("openai", { validity_days: 30, validity_unit: "day" }).text()).toContain("/ 30payment.days");
  });

  it("uses the configured currency symbol while preserving USD for legacy plans", () => {
    const cnyPlan = mountPlanCard("openai", { currency: "CNY", original_price: 20 }).text();

    expect(cnyPlan).toContain("¥10CNY");
    expect(cnyPlan).toContain("¥20CNY");
    expect(mountPlanCard("openai", { currency: "USD" }).text()).toContain("$10USD");
    expect(mountPlanCard("openai", { currency: "" }).text()).toContain("$10");
  });

  it("keeps peak-rate details in the system tooltip", () => {
    const wrapper = mountPlanCard("openai", {
      peak_rate_enabled: true,
      peak_start: "14:00",
      peak_end: "17:00",
      peak_rate_multiplier: 1.5,
    });

    expect(wrapper.findComponent(HelpTooltip).exists()).toBe(true);
    expect(document.body.textContent).toContain("14:00-17:00 ×1.5");
  });

  it("places the description below the title and exposes a distinct hover state", () => {
    const wrapper = mountPlanCard("openai", { description: "Best for production workloads" });
    const card = wrapper.find('[data-test="subscription-plan-card"]');
    const title = card.find("h3");
    const description = card.find('[data-test="plan-description"]');
    const price = card.find('[data-test="plan-price"]');

    expect(title.element.compareDocumentPosition(description.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(description.element.compareDocumentPosition(price.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.classes()).toContain("hover:-translate-y-1");
    expect(card.classes()).toContain("hover:shadow-[0_18px_38px_rgba(15,118,110,0.12)]");
    expect(card.classes()).toContain("hover:ring-2");
  });

  it("renders the selected promotional badge only for recommended plans", () => {
    expect(mountPlanCard("openai").find('[data-test="recommended-badge"]').exists()).toBe(false);

    const recommended = mountPlanCard("openai", { recommended: true });
    expect(recommended.find('[data-test="recommended-badge"]').exists()).toBe(true);
    expect(recommended.find('[data-test="recommended-badge"]').text()).toBe("payment.recommended");
  });

  it("uses the large-card layout and keeps the platform badge after the plan name", () => {
    const wrapper = mountPlanCard("openai");
    const card = wrapper.find('[data-test="subscription-plan-card"]');
    const title = card.find("h3");
    const badge = title.element.nextElementSibling;

    expect(card.classes()).toContain("min-h-[410px]");
    expect(badge?.textContent).toContain("OpenAI");
  });

  it("keeps the validity period on one line for four-digit prices", () => {
    const wrapper = mountPlanCard("openai", { price: 1000 });
    const price = wrapper.find('[data-test="plan-price"]');
    const validity = wrapper.find('[data-test="plan-validity"]');

    expect(price.classes()).toContain("text-[36px]");
    expect(validity.classes()).toContain("whitespace-nowrap");
  });
});
