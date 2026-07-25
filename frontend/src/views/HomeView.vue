<template>
  <div v-if="homeContent" class="min-h-screen">
    <iframe v-if="isHomeContentUrl" :src="homeContent.trim()" class="h-screen w-full border-0" allowfullscreen></iframe>
    <div v-else v-html="homeContent"></div>
  </div>

  <div v-else class="marketing-home">
    <header class="site-header">
      <div class="shell nav-row">
        <router-link to="/" class="brand">
          <img :src="siteLogo || '/logo.svg'" :alt="siteName" />
          <span>{{ siteName }}</span>
        </router-link>
        <nav class="nav-links" aria-label="首页导航">
          <a href="#offers">购买方式</a>
          <a href="#access">快速接入</a>
          <a v-if="faqs.length" href="#faq">常见问题</a>
          <div
            v-if="contactInfo"
            ref="contactWrap"
            class="contact-wrap nav-contact-wrap"
            :class="{ 'is-open': contactOpen }"
            @keydown.esc="contactOpen = false"
          >
            <button
              type="button"
              class="contact-trigger"
              :aria-expanded="contactOpen"
              aria-controls="home-contact-popover"
              @click="contactOpen = !contactOpen"
            >
              联系我们
            </button>
            <div id="home-contact-popover" class="contact-popover" role="dialog" aria-label="客服联系方式">
              <div class="contact-popover-head">
                <strong>客服联系方式</strong>
                <span>联系我们获取帮助</span>
              </div>
              <p>{{ contactInfo }}</p>
              <button type="button" class="contact-copy" @click.stop="copyContactInfo">
                <Icon name="copy" size="sm" aria-hidden="true" />
                复制联系方式
              </button>
            </div>
          </div>
        </nav>
        <router-link
          v-if="!isAuthenticated"
          to="/login"
          class="button button-primary button-small start-button"
          aria-label="开始"
        >
          <span class="start-label" aria-hidden="true"><span>开</span><span>始</span></span>
          <Icon name="arrowRight" size="sm" aria-hidden="true" />
        </router-link>
        <router-link
          v-else
          :to="dashboardPath"
          class="account-entry"
          :aria-label="`${displayName}，进入控制台`"
        >
          <span class="account-avatar">
            <img v-if="avatarUrl" :src="avatarUrl" :alt="displayName" />
            <span v-else>{{ userInitials }}</span>
          </span>
          <strong>控制台</strong>
          <Icon name="arrowRight" size="sm" class="account-arrow" />
        </router-link>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="shell hero-inner">
          <div class="hero-copy">
            <div class="eyebrow"><span></span>高级模型持续上新</div>
            <h1>{{ homeTitle }}<strong>{{ homeTitleHighlight }}</strong></h1>
            <p>{{ siteSubtitle }}</p>
            <div class="hero-actions">
              <router-link :to="isAuthenticated ? dashboardPath : '/login'" class="button button-primary">立即开始</router-link>
              <a v-if="docUrl" :href="docUrl" target="_blank" rel="noopener noreferrer" class="button button-ghost">查看帮助文档</a>
            </div>
          </div>

          <aside
            class="recharge-ticket"
            :class="{ 'ticket-generic': !hasRechargeOffer, 'is-entering': ticketEntering }"
            @animationend="handleTicketAnimationEnd"
          >
            <span class="ticket-pin" aria-hidden="true"></span>
            <div class="ticket-heading">
              <div class="ticket-label">当前充值策略</div>
              <span class="ticket-discount">
                <span v-if="rechargeDiscountValue">低至</span>
                <strong>{{ rechargeDiscountValue ? `${rechargeDiscountValue}折` : '实时优惠' }}</strong>
              </span>
            </div>
            <template v-if="hasRechargeOffer">
              <div class="ticket-value"><b>{{ formatNumber(landing!.balance_recharge_multiplier) }}</b> 倍到账</div>
              <div class="ticket-example">
                <div class="ticket-example-item">
                  <span>充值金额</span>
                  <strong>{{ formatMoney(landing!.example_amount, landing!.recharge_currency) }}</strong>
                </div>
                <Icon name="arrowRight" size="sm" class="ticket-example-arrow" aria-hidden="true" />
                <div class="ticket-example-item ticket-example-result">
                  <span>可用额度</span>
                  <strong>{{ formatMoney(landing!.example_credited_amount, landing!.credited_currency || 'USD') }}</strong>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="ticket-value ticket-value-generic">灵活充值，按量使用</div>
              <div class="ticket-foot">登录后查看当前充值规则与实时到账额度</div>
            </template>
          </aside>
        </div>
      </section>

      <div class="shell proof-strip">
        <div><strong>{{ hasRechargeOffer ? `${formatNumber(landing!.balance_recharge_multiplier)}× 到账` : '灵活充值' }}</strong><span>按量使用，随用随充</span></div>
        <div><strong>订阅更省</strong><span>高频使用优先选择</span></div>
        <div><strong>持续更新</strong><span>跟进最新高级模型</span></div>
      </div>

      <section id="offers" class="section offers-section">
        <div class="shell">
          <div class="section-heading">
            <div class="eyebrow">TWO WAYS TO START</div>
            <h2>一种是灵活，<br />一种是更划算。</h2>
            <p>按使用频率选择充值或订阅，购买路径简单清楚。</p>
          </div>

          <div class="offer-grid">
            <article class="offer-card">
              <span v-if="rechargeDiscountValue" class="balance-promo-badge">
                <small>低至</small><strong>{{ rechargeDiscountValue }}折</strong>
              </span>
              <span class="offer-label">按量充值 · 随用随充</span>
              <h3>余额充值</h3>
              <p>适合偶尔调用、项目测试和用量波动较大的用户。</p>
              <div v-if="hasRechargeOffer" class="offer-price"><b>{{ formatNumber(landing!.balance_recharge_multiplier) }}</b><span>倍到账</span></div>
              <div v-else class="offer-price offer-price-text">实时规则以充值页为准</div>
              <div class="benefit-list">
                <span>用多少扣多少</span>
                <span>余额明细实时可查</span>
                <span>高级模型持续更新</span>
              </div>
              <router-link to="/purchase" class="button button-dark">立即充值</router-link>
            </article>

            <article class="offer-card subscription-card">
              <span v-if="selectedPlan?.recommended" class="recommend-burst">推荐</span>
              <span class="offer-label">订阅套餐 · 高频更省</span>
              <template v-if="selectedPlan">
                <h3>{{ selectedPlan.name }}</h3>
                <p>{{ selectedPlan.description || '适合高频调用和稳定使用高级模型的用户。' }}</p>
                <div class="plan-price-row">
                  <div class="plan-price-main">
                    <div class="offer-price">
                      <span>{{ currencySymbol(selectedPlan.currency) }}</span><b>{{ formatNumber(selectedPlan.price) }}</b><span>/ {{ validityLabel(selectedPlan) }}</span>
                    </div>
                    <div v-if="selectedPlan.original_price && planDiscount" class="plan-saving">
                      <span>原价 {{ currencySymbol(selectedPlan.currency) }}{{ formatNumber(selectedPlan.original_price) }}</span>
                      <strong>立省 {{ planDiscount }}%</strong>
                    </div>
                  </div>
                  <div class="plan-monthly-quota">
                    <span>月总额度</span><strong>{{ planMonthlyQuotaLabel }}</strong>
                  </div>
                </div>
                <div class="benefit-list">
                  <span v-for="benefit in planMarketingBenefits" :key="benefit">{{ benefit }}</span>
                </div>
                <router-link to="/purchase#subscription" class="button button-primary">立即订阅</router-link>
              </template>
              <template v-else>
                <h3>登录查看实时套餐</h3>
                <p>套餐价格和推荐状态以购买页当前信息为准。</p>
                <div class="benefit-list benefit-list-spaced">
                  <span>高频使用更划算</span>
                  <span>套餐权益后台实时更新</span>
                  <span>没有虚构价格和折扣</span>
                </div>
                <router-link to="/purchase#subscription" class="button button-primary">查看订阅套餐</router-link>
              </template>
            </article>
          </div>
        </div>
      </section>

      <section id="access" class="access-section">
        <div class="shell access-grid">
          <div class="access-copy">
            <div class="eyebrow eyebrow-light">ONE ENDPOINT, ALWAYS READY</div>
            <h2>模型持续更新，<br />接入方式始终不变。</h2>
            <p>一个 API Key，持续使用平台开放的高级模型。无需更换接口，也无需重复适配。</p>
            <div class="access-actions">
              <router-link to="/keys" class="button button-access-primary">
                <Icon name="key" size="sm" aria-hidden="true" />
                创建 API Key
              </router-link>
              <a
                v-if="docUrl"
                :href="docUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="button button-access-secondary"
              >
                <Icon name="book" size="sm" aria-hidden="true" />
                查看帮助文档
              </a>
            </div>
          </div>
          <div class="code-panel">
            <div class="code-head"><span>curl · POST /v1/responses</span><button type="button" title="复制 curl 请求" aria-label="复制 curl 请求" @click="copyCurl"><Icon name="copy" size="sm" /></button></div>
            <pre><code>{{ curlExample }}</code></pre>
          </div>
        </div>
      </section>

      <section v-if="faqs.length" id="faq" class="section faq-section">
        <div class="shell faq-shell">
          <div class="section-heading">
            <div class="eyebrow">FAQ</div>
            <h2>常见疑问，<br />一次说清。</h2>
          </div>
          <div class="faq-list">
            <article v-for="item in faqs" :key="item.id" class="faq-item">
              <button type="button" :aria-expanded="openFAQ === item.id" @click="openFAQ = openFAQ === item.id ? null : item.id">
                <span>{{ item.title }}</span><Icon name="plus" size="md" :class="{ 'rotate-45': openFAQ === item.id }" />
              </button>
              <div v-show="openFAQ === item.id" class="faq-answer" v-html="faqAnswerHtml.get(item.id)"></div>
            </article>
          </div>
        </div>
      </section>
    </main>

    <footer>
      <div class="shell footer-row">
        <span>© {{ currentYear }} {{ siteName }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuthStore, useAppStore } from '@/stores'
import { paymentAPI, type LandingPaymentData, type LandingPlan } from '@/api/payment'
import { listPublicFAQs } from '@/api/faqs'
import type { FAQ } from '@/types'
import Icon from '@/components/icons/Icon.vue'
import { renderFAQMarkdown } from '@/utils/faqMarkdown'
import { sanitizeUrl } from '@/utils/url'

const appStore = useAppStore()
const authStore = useAuthStore()
const landing = ref<LandingPaymentData | null>(null)
const faqs = ref<FAQ[]>([])
const openFAQ = ref<number | null>(null)
const contactOpen = ref(false)
const contactWrap = ref<HTMLElement | null>(null)
const ticketEntering = ref(true)

const settings = computed(() => appStore.cachedPublicSettings)
const siteName = computed(() => settings.value?.site_name || appStore.siteName || 'Sub2API')
const siteLogo = computed(() => sanitizeUrl(settings.value?.site_logo || appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const siteSubtitle = computed(() => settings.value?.site_subtitle || '充值更耐用，订阅更划算。一个 API Key，持续使用不断更新的高级模型。')
const homeTitle = computed(() => settings.value?.home_title || '把预算花在')
const homeTitleHighlight = computed(() => settings.value?.home_title_highlight || '真正好用的模型。')
const docUrl = computed(() => sanitizeUrl(settings.value?.doc_url || appStore.docUrl || ''))
const contactInfo = computed(() => (settings.value?.contact_info || appStore.contactInfo || '').trim())
const homeContent = computed(() => settings.value?.home_content || '')
const isHomeContentUrl = computed(() => /^https?:\/\//i.test(homeContent.value.trim()))
const currentYear = new Date().getFullYear()
const isAuthenticated = computed(() => authStore.isAuthenticated)
const dashboardPath = computed(() => authStore.isAdmin ? '/admin/dashboard' : '/dashboard')
const displayName = computed(() => authStore.user?.username?.trim() || authStore.user?.email?.split('@')[0] || '用户')
const avatarUrl = computed(() => sanitizeUrl(authStore.user?.avatar_url?.trim() || '', { allowDataUrl: true }))
const userInitials = computed(() => displayName.value.slice(0, 2).toUpperCase())
const faqAnswerHtml = computed(() => new Map(faqs.value.map((item) => [item.id, renderFAQMarkdown(item.answer)])))

const hasRechargeOffer = computed(() => Boolean(
  landing.value?.payment_enabled &&
  !landing.value.balance_disabled &&
  landing.value.balance_recharge_multiplier > 0 &&
  landing.value.recharge_currency
))
const rechargeDiscountValue = computed(() => {
  const rechargeMultiplier = landing.value?.balance_recharge_multiplier
  const minimumGroupRate = landing.value?.minimum_group_rate_multiplier ?? 1
  if (!Number.isFinite(rechargeMultiplier) || !rechargeMultiplier || rechargeMultiplier <= 0) return ''
  if (!Number.isFinite(minimumGroupRate) || minimumGroupRate < 0) return ''
  return formatNumber((10 / rechargeMultiplier) * minimumGroupRate)
})
const selectedPlan = computed(() => {
  const plans = landing.value?.plans || []
  return plans.find((plan) => plan.recommended) || plans[0] || null
})
const planDiscount = computed(() => {
  const plan = selectedPlan.value
  if (!plan?.original_price || plan.original_price <= plan.price) return 0
  return Math.round((1 - plan.price / plan.original_price) * 100)
})
const planMarketingBenefits = computed(() => {
  const plan = selectedPlan.value
  if (!plan) return []
  const configured = (plan.features || '').split(/[\n,，]/).map((item) => item.trim()).filter(Boolean)
  const defaults = ['套餐专属调用通道', '高频调用更省预算', '高性价比订阅方案']
  return [...new Set([...configured, ...defaults])].slice(0, 3)
})
const planMonthlyQuotaLabel = computed(() => {
  const value = selectedPlan.value?.monthly_limit_usd
  if (value === null) return '不限'
  if (typeof value === 'number' && Number.isFinite(value)) return `$${formatNumber(value)}`
  return '实时更新'
})
const apiBaseURL = computed(() => (settings.value?.api_base_url || window.location.origin).replace(/\/$/, ''))
const curlExample = computed(() => `curl ${apiBaseURL.value}/v1/responses \\
  -H "Authorization: Bearer $SUB2API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.6-sol",
    "input": "帮我分析这个项目"
  }'`)

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)
}
function currencySymbol(currency = '') {
  const code = currency.toUpperCase()
  if (code === 'CNY') return '¥'
  if (code === 'USD') return '$'
  if (code === 'EUR') return '€'
  if (code === 'GBP') return '£'
  return code ? `${code} ` : ''
}
function formatMoney(value: number, currency: string) {
  return `${currencySymbol(currency)}${formatNumber(value)}`
}
function validityLabel(plan: LandingPlan) {
  if (plan.validity_unit === 'month') return `${plan.validity_days} 月`
  if (plan.validity_unit === 'year') return `${plan.validity_days} 年`
  return plan.validity_days === 30 ? '月' : `${plan.validity_days} 天`
}
async function copyCurl() {
  try { await navigator.clipboard.writeText(curlExample.value); appStore.showSuccess('curl 请求已复制') }
  catch { appStore.showError('复制失败，请手动复制') }
}
async function copyContactInfo() {
  try { await navigator.clipboard.writeText(contactInfo.value); appStore.showSuccess('联系方式已复制') }
  catch { appStore.showError('复制失败，请手动复制') }
}
function handleContactOutside(event: PointerEvent) {
  if (contactWrap.value && !contactWrap.value.contains(event.target as Node)) contactOpen.value = false
}
function handleTicketAnimationEnd(event: AnimationEvent) {
  if (event.target === event.currentTarget && event.animationName.startsWith('ticket-entry-swing')) ticketEntering.value = false
}

onMounted(async () => {
  document.addEventListener('pointerdown', handleContactOutside)
  authStore.checkAuth()
  if (!appStore.publicSettingsLoaded) await appStore.fetchPublicSettings()
  if (homeContent.value) return
  const [landingResult, faqResult] = await Promise.allSettled([paymentAPI.getLandingData(), listPublicFAQs()])
  if (landingResult.status === 'fulfilled') landing.value = landingResult.value.data
  if (faqResult.status === 'fulfilled') faqs.value = faqResult.value
})

onBeforeUnmount(() => document.removeEventListener('pointerdown', handleContactOutside))
</script>

<style scoped>
.button.start-button{width:104px;min-height:40px;padding:0 14px;justify-content:center;gap:16px;color:#fff;background:#0d915e;box-shadow:none;font-size:15px}.button.start-button:hover{color:#fff;background:#0a7e51}.start-label{display:inline-flex;gap:2px}.start-button svg{width:17px;height:17px;stroke-width:2}.account-entry{height:42px;padding:3px 14px 3px 3px;border:0;border-radius:999px;display:flex;align-items:center;gap:10px;color:#244b38;background:rgba(13,145,94,.08);transition:background-color .18s ease,transform .18s ease}.account-entry:hover{color:#183e2c;background:rgba(13,145,94,.14);transform:translateY(-1px)}.account-entry>strong{font-size:14px;font-weight:800}.account-avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;overflow:hidden;flex:0 0 auto;color:#fff;background:#0d915e;font-size:12px;font-weight:900}.account-avatar img{width:100%;height:100%;object-fit:cover}.account-arrow{width:14px;height:14px;margin-left:2px;flex:0 0 auto;color:#5c7969;transform:rotate(-45deg)}
.hero-actions .button-ghost{background:rgba(255,255,255,.78);box-shadow:0 7px 20px rgba(24,68,45,.07)}.hero-actions .button-ghost:hover{border-color:#a9b9ad;background:#fff;box-shadow:0 10px 24px rgba(24,68,45,.11)}
.marketing-home{min-height:100vh;color:#152019;background:#f4f6ef;letter-spacing:0}.shell{width:min(1160px,calc(100% - 48px));margin:0 auto}.site-header{background:#f4f6ef}.nav-row{height:74px;display:flex;align-items:center;justify-content:space-between;gap:24px}.brand{display:flex;align-items:center;gap:10px;color:#152019;font-size:18px;font-weight:900}.brand img{width:34px;height:34px;border-radius:7px}.nav-links{height:100%;display:flex;align-items:center;gap:2px;color:#46534b;font-size:14px;font-weight:700}.nav-links a{position:relative;height:58px;padding:0 17px;display:flex;align-items:center;transition:color .2s ease}.nav-links a:after{position:absolute;left:50%;bottom:7px;width:20px;height:2px;border-radius:999px;background:linear-gradient(90deg,#0d915e,#55b985);content:'';opacity:0;transform:translateX(-50%) scaleX(.4);transition:opacity .2s ease,transform .2s ease}.nav-links a:hover{color:#086f49}.nav-links a:hover:after{opacity:1;transform:translateX(-50%) scaleX(1)}.nav-links a:focus-visible{outline:2px solid rgba(13,145,94,.42);outline-offset:1px;color:#086f49}.nav-links a:focus-visible:after{opacity:1;transform:translateX(-50%) scaleX(1)}.button{min-height:46px;padding:0 20px;border:1px solid transparent;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;transition:transform .18s ease,background-color .18s ease}.button:hover{transform:translateY(-2px)}.button-small{min-height:40px;padding:0 17px}.button-primary{color:#fff;background:#0d915e;box-shadow:0 10px 28px rgba(13,145,94,.18)}.button-primary:hover{background:#0a7e51}.button-ghost{color:#25332b;border-color:#b9c5bc;background:transparent}.button-dark{width:100%;color:#fff;background:#142019}.hero{position:relative;min-height:690px;border-bottom:1px solid #ccd5cd;overflow:hidden}.hero:before{position:absolute;inset:0;background-image:linear-gradient(rgba(14,121,79,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(14,121,79,.045) 1px,transparent 1px);background-size:72px 72px;content:''}.hero-inner{position:relative;min-height:610px;padding:78px 0;display:flex;align-items:center}.hero-copy{max-width:700px}.eyebrow{margin-bottom:18px;display:flex;align-items:center;gap:8px;color:#ef4c24;font-size:12px;font-weight:900}.eyebrow span{width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 0 5px rgba(239,76,36,.12)}h1,h2,h3,p{margin-top:0}h1{max-width:760px;margin-bottom:22px;font-size:80px;line-height:.98;font-weight:950}h1 strong{display:block;color:#0d915e}h2{margin-bottom:14px;font-size:52px;line-height:1.07}h3{font-size:27px}.hero-copy>p{max-width:630px;margin-bottom:30px;color:#657169;font-size:18px;line-height:1.72}.hero-actions{display:flex;flex-wrap:wrap;gap:11px}.recharge-ticket{position:absolute;right:1%;top:168px;width:455px;padding:31px 30px 28px;border:1px solid #aebfb1;border-radius:8px;background:rgba(255,255,255,.95);box-shadow:0 32px 74px rgba(24,68,45,.16);transform-origin:50% -24px;animation:ticket-in 1.35s ease-out both,ticket-sway 5.6s ease-in-out 1.6s infinite;backdrop-filter:blur(10px)}.ticket-pin{position:absolute;left:50%;top:-30px;width:23px;height:23px;border:3px solid #bd321d;border-radius:50%;background:#f05a2b;box-shadow:0 5px 8px rgba(111,33,17,.28),inset -3px -3px 0 rgba(170,45,24,.35);transform:translateX(-50%)}.ticket-pin:after{position:absolute;left:8px;top:17px;width:2px;height:15px;background:#8e7768;content:''}.ticket-label{font-size:13px;font-weight:800}.ticket-value{margin:13px 0 5px;color:#0d915e;font-size:38px;font-weight:950}.ticket-value b{font-size:76px}.ticket-value-generic{max-width:320px;font-size:34px;line-height:1.15}.ticket-foot{color:#727d75;font-size:13px}.proof-strip{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #cbd4cc}.proof-strip div{padding:27px;text-align:center;border-right:1px solid #cbd4cc}.proof-strip div:last-child{border-right:0}.proof-strip strong{display:block;margin-bottom:6px;font-size:21px}.proof-strip span{color:#78827b;font-size:12px}.section{padding:102px 0}.section-heading{max-width:710px;margin-bottom:42px}.section-heading p{color:#6d776f;font-size:17px;line-height:1.72}.offer-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.offer-card{position:relative;min-height:430px;padding:34px;border:1px solid #cbd6cd;border-radius:8px;display:flex;flex-direction:column;background:#fff;box-shadow:0 12px 32px rgba(24,68,45,.06)}.subscription-card{border:2px solid #0d915e}.offer-label{color:#707b73;font-size:12px;font-weight:900}.offer-card h3{margin:18px 0 9px}.offer-card>p{max-width:430px;color:#6c756e;line-height:1.7}.offer-price{min-height:76px;margin:22px 0 8px;display:flex;align-items:baseline;gap:7px}.offer-price b{font-size:64px;line-height:1}.offer-price span{font-size:17px;font-weight:800}.offer-price-text{align-items:center;color:#4e5d54;font-size:21px;font-weight:800}.benefit-list{margin:18px 0 27px;padding:18px 0;border-block:1px solid #e1e6e2;display:grid;gap:9px;color:#4f5c54;font-size:13px}.benefit-list span:before{margin-right:8px;color:#0d915e;font-weight:900;content:'✓'}.benefit-list-spaced{margin-top:auto}.offer-card>.button{width:100%;margin-top:auto}.recommend-burst{position:absolute;right:-8px;top:-20px;width:94px;height:84px;display:grid;place-items:center;clip-path:polygon(50% 0,59% 16%,74% 5%,78% 23%,96% 18%,89% 38%,100% 50%,84% 61%,95% 79%,75% 76%,70% 97%,55% 82%,43% 100%,34% 81%,14% 92%,17% 69%,0 61%,15% 47%,2% 31%,24% 30%,25% 8%,42% 20%);color:#fff9d8;background:#f05a24;transform:rotate(7deg);font-size:22px;font-weight:950;text-shadow:2px 2px #a9180c}.access-section{padding:90px 0;color:#eaf3ed;background:#13231a}.access-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:70px;align-items:center}.eyebrow-light{color:#55d89a}.access-copy p{color:#a8b6ad;line-height:1.75}.access-actions{margin-top:28px;display:flex;flex-wrap:wrap;gap:10px}.access-actions .button{gap:8px}.button-access-primary{color:#10271b;background:#55d89a}.button-access-primary:hover{color:#0a1d13;background:#6fe3aa}.button-access-secondary{color:#dce8e0;border-color:#4a6254;background:rgba(255,255,255,.03)}.button-access-secondary:hover{color:#fff;border-color:#6f8879;background:rgba(255,255,255,.08)}.code-panel{overflow:hidden;border:1px solid #3f5447;border-radius:8px;background:#0a110d}.code-head{height:45px;padding:0 16px;border-bottom:1px solid #2b3a30;display:flex;align-items:center;justify-content:space-between;color:#8fa097;font:12px ui-monospace,monospace}.code-head button{width:30px;height:30px;border:1px solid #405248;border-radius:5px;display:grid;place-items:center;color:#b7c8be;background:#132019}.code-panel pre{margin:0;padding:24px;overflow:auto;color:#c5ead2;font:13px/1.75 ui-monospace,monospace;white-space:pre}.faq-shell{max-width:850px}.faq-list{border-top:1px solid #d2d9d3}.faq-item{border-bottom:1px solid #d2d9d3}.faq-item button{width:100%;padding:22px 0;border:0;display:flex;align-items:center;justify-content:space-between;gap:24px;color:#19241d;background:transparent;text-align:left;font-weight:800}.faq-item button svg{flex:0 0 auto;transition:transform .18s ease}.faq-answer{padding:0 42px 22px 0;color:#68736b;line-height:1.75;white-space:pre-line}footer{position:relative;padding:30px 0;border-top:1px solid #d1d8d2;color:#737d76;font-size:12px}.footer-row{display:flex;align-items:center;justify-content:space-between}.contact-wrap{position:relative}.contact-trigger{padding:7px 9px;border:0;border-radius:5px;display:flex;align-items:center;gap:7px;color:#536259;background:transparent;font-size:12px;font-weight:800;transition:color .18s ease,background-color .18s ease}.contact-trigger:hover,.contact-wrap:focus-within .contact-trigger,.contact-wrap.is-open .contact-trigger{color:#176d4a;background:#e5eee7}.contact-popover{position:absolute;z-index:30;right:0;bottom:calc(100% + 12px);width:min(320px,calc(100vw - 28px));padding:18px;border:1px solid #c8d4cb;border-radius:7px;color:#243129;background:#fff;box-shadow:0 18px 44px rgba(20,54,37,.16);opacity:0;visibility:hidden;pointer-events:none;transform:translateY(6px);transition:opacity .16s ease,visibility .16s ease,transform .16s ease}.contact-wrap:hover .contact-popover,.contact-wrap:focus-within .contact-popover,.contact-wrap.is-open .contact-popover{opacity:1;visibility:visible;pointer-events:auto;transform:translateY(0)}.contact-popover:after{position:absolute;right:21px;bottom:-7px;width:12px;height:12px;border-right:1px solid #c8d4cb;border-bottom:1px solid #c8d4cb;background:#fff;transform:rotate(45deg);content:''}.contact-popover-head{margin-bottom:13px;display:flex;align-items:flex-start;flex-direction:column;gap:4px}.contact-popover-head strong{color:#18251d;font-size:15px}.contact-popover-head span{color:#869087;font-size:11px}.contact-popover p{margin-bottom:15px;padding:12px;border-radius:5px;color:#34443a;background:#f3f6f3;font-size:13px;line-height:1.7;white-space:pre-line;overflow-wrap:anywhere}.contact-copy{width:100%;min-height:38px;border:0;border-radius:5px;display:flex;align-items:center;justify-content:center;gap:7px;color:#fff;background:#0d915e;font-size:12px;font-weight:800;transition:background-color .18s ease}.contact-copy:hover{background:#0a7e51}@keyframes ticket-in{0%{transform:rotate(-7deg) translateY(-12px);opacity:0}32%{transform:rotate(4deg);opacity:1}55%{transform:rotate(-2.5deg)}75%{transform:rotate(1.2deg)}100%{transform:rotate(-1.5deg)}}@keyframes ticket-sway{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1deg)}}@media(prefers-reduced-motion:reduce){.recharge-ticket{animation:none;transform:rotate(-1.5deg)}}
@media(max-width:1050px){h1{font-size:64px}.recharge-ticket{width:390px;right:-50px}.hero-copy{max-width:590px}}
@media(max-width:820px){.shell{width:min(100% - 28px,680px)}.nav-links{display:none}.nav-row{height:66px}h1{font-size:42px;line-height:1.04}h2{font-size:38px}.hero{min-height:760px}.hero-inner{min-height:690px;padding:48px 0 300px;align-items:flex-start}.hero-copy>p{font-size:16px}.recharge-ticket{right:14px;top:auto;bottom:55px;width:calc(100% - 28px);padding:25px}.ticket-value b{font-size:62px}.proof-strip,.offer-grid,.access-grid{grid-template-columns:1fr}.proof-strip div{border-right:0;border-bottom:1px solid #cbd4cc}.proof-strip div:last-child{border-bottom:0}.section,.access-section{padding:72px 0}.offer-grid{gap:28px}.offer-card{min-height:390px;padding:25px}.access-grid{gap:38px}.code-panel pre{font-size:11px}.footer-row{align-items:flex-start;flex-direction:column;gap:10px}.contact-popover{right:auto;left:0}.contact-popover:after{right:auto;left:20px}}
@media(max-width:520px){.brand span{display:none}.account-entry{height:40px;padding:3px 11px 3px 3px;gap:8px}.account-avatar{width:34px;height:34px}.account-entry>strong{font-size:13px}.account-arrow{width:12px;height:12px}.button.start-button{width:104px;min-height:40px;padding:0 14px;gap:14px}}
.nav-contact-wrap{height:100%;display:flex;align-items:center}.nav-contact-wrap:before{position:absolute;z-index:29;top:100%;left:50%;width:320px;height:12px;transform:translateX(-50%);content:''}.nav-contact-wrap .contact-trigger{position:relative;height:58px;padding:0 17px;border-radius:0;color:#46534b;background:transparent;font-size:14px;font-weight:700;transition:color .2s ease}.nav-contact-wrap .contact-trigger:after{position:absolute;left:50%;bottom:7px;width:20px;height:2px;border-radius:999px;background:linear-gradient(90deg,#0d915e,#55b985);content:'';opacity:0;transform:translateX(-50%) scaleX(.4);transition:opacity .2s ease,transform .2s ease}.nav-contact-wrap .contact-trigger:hover,.nav-contact-wrap:focus-within .contact-trigger,.nav-contact-wrap.is-open .contact-trigger{color:#086f49;background:transparent}.nav-contact-wrap .contact-trigger:hover:after,.nav-contact-wrap:focus-within .contact-trigger:after,.nav-contact-wrap.is-open .contact-trigger:after{opacity:1;transform:translateX(-50%) scaleX(1)}.nav-contact-wrap .contact-trigger:focus-visible{outline:none}.nav-contact-wrap .contact-popover{top:calc(100% + 8px);bottom:auto;left:50%;right:auto;font-weight:400;text-align:left;transform:translate(-50%,-6px)}.nav-contact-wrap:hover .contact-popover,.nav-contact-wrap:focus-within .contact-popover,.nav-contact-wrap.is-open .contact-popover{transform:translate(-50%,0)}.nav-contact-wrap .contact-popover:after{top:-7px;bottom:auto;left:50%;right:auto;border:0;border-top:1px solid #c8d4cb;border-left:1px solid #c8d4cb;transform:translateX(-50%) rotate(45deg)}
.recharge-ticket{width:455px;padding:31px 30px 28px;border-color:#a7b8aa;border-right-width:2px;border-bottom:2px solid #8fa394;background:linear-gradient(145deg,rgba(255,255,255,.99) 0%,rgba(255,255,255,.97) 58%,rgba(241,247,243,.97) 100%);box-shadow:0 16px 24px rgba(18,53,35,.1),18px 34px 68px rgba(18,63,40,.2),inset 0 1px 0 rgba(255,255,255,.95),inset 0 -1px 0 rgba(88,118,99,.12);transform-origin:62% 0;transform-style:preserve-3d;will-change:transform,box-shadow;animation:none;transform:perspective(1100px) rotateZ(-2.2deg) rotateX(1.2deg) rotateY(-1.2deg);transition:box-shadow .35s ease,border-color .35s ease}
.recharge-ticket.is-entering{animation:ticket-entry-swing 1.75s linear .35s 1 both}.recharge-ticket:not(.is-entering):hover{animation:ticket-hit-swing 1.75s linear 1 both}
.ticket-pin{z-index:2;left:62%;top:-17px}
.ticket-pin:after{top:16px;height:11px}
.ticket-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
.ticket-discount{position:relative;margin:-12px -6px 0 0;padding:8px 13px 9px;border:2px solid #c9361b;border-radius:6px;display:flex;align-items:baseline;gap:5px;color:#fff7e8;background:#ef542b;box-shadow:4px 5px 0 #a92816,0 10px 22px rgba(176,45,22,.18);transform:rotate(3deg);line-height:1;white-space:nowrap}.ticket-discount:after{position:absolute;right:8px;bottom:-7px;width:12px;height:12px;border-right:2px solid #c9361b;border-bottom:2px solid #c9361b;background:#ef542b;transform:rotate(45deg);content:''}.ticket-discount span{font-size:12px;font-weight:900}.ticket-discount strong{position:relative;z-index:1;font-size:22px;font-weight:950}
.ticket-value{margin:10px 0 4px;font-size:38px;line-height:1}.ticket-value b{font-size:76px}.ticket-foot{line-height:1.55}.ticket-example{margin-top:10px;padding-top:12px;border-top:1px solid #d9e2db;display:grid;grid-template-columns:1fr 30px 1fr;align-items:center;gap:10px}.ticket-example-item{display:grid;gap:3px}.ticket-example-item span{color:#7a867e;font-size:11px;font-weight:700}.ticket-example-item strong{color:#26382d;font-size:17px;font-weight:900}.ticket-example-result{text-align:right}.ticket-example-result strong{color:#0d8457}.ticket-example-arrow{width:18px;height:18px;justify-self:center;color:#e6532c;stroke-width:2.4}
.plan-price-row{display:flex;align-items:center;justify-content:space-between;gap:18px}.plan-price-main{min-width:0}.plan-price-row .offer-price{margin:22px 0 5px}.plan-saving{display:flex;align-items:center;gap:8px;white-space:nowrap}.plan-saving span{color:#8a948d;font-size:12px;text-decoration:line-through}.plan-saving strong{padding:5px 8px;border-radius:4px;color:#b5361d;background:#fff0e9;font-size:13px;font-weight:900}.plan-monthly-quota{min-width:112px;padding-left:20px;border-left:1px solid #d8e0da;color:#285440;text-align:right;white-space:nowrap}.plan-monthly-quota span,.plan-monthly-quota strong{display:block}.plan-monthly-quota span{margin-bottom:7px;color:#7b8780;font-size:11px;font-weight:700}.plan-monthly-quota strong{font-size:21px;font-weight:950}.subscription-card .benefit-list{margin-top:18px}
.balance-promo-badge{position:absolute;right:24px;top:23px;padding:7px 10px 8px;border:2px solid #d74724;border-radius:5px;display:flex;align-items:baseline;gap:4px;color:#b8321b;background:#fff1e9;box-shadow:3px 3px 0 #efb19d;transform:rotate(2deg);line-height:1;white-space:nowrap}.balance-promo-badge small{font-size:10px;font-weight:900}.balance-promo-badge strong{font-size:18px;font-weight:950}
@keyframes ticket-hit-swing{0%{transform:perspective(1100px) rotateZ(-2.2deg) rotateX(1.2deg) rotateY(-1.2deg);animation-timing-function:cubic-bezier(.18,.72,.35,1)}10%{transform:perspective(1100px) rotateZ(-6.8deg) rotateX(1.2deg) rotateY(-1.2deg);animation-timing-function:cubic-bezier(.37,0,.63,1)}29%{transform:perspective(1100px) rotateZ(.9deg) rotateX(1.2deg) rotateY(-1.2deg);animation-timing-function:cubic-bezier(.37,0,.63,1)}48%{transform:perspective(1100px) rotateZ(-4.35deg) rotateX(1.2deg) rotateY(-1.2deg);animation-timing-function:cubic-bezier(.37,0,.63,1)}67%{transform:perspective(1100px) rotateZ(-.8deg) rotateX(1.2deg) rotateY(-1.2deg);animation-timing-function:cubic-bezier(.37,0,.63,1)}85%{transform:perspective(1100px) rotateZ(-3.05deg) rotateX(1.2deg) rotateY(-1.2deg);animation-timing-function:cubic-bezier(.37,0,.63,1)}100%{transform:perspective(1100px) rotateZ(-2.2deg) rotateX(1.2deg) rotateY(-1.2deg)}}
@keyframes ticket-entry-swing{0%{transform:perspective(1100px) rotateZ(-2.2deg) rotateX(1.2deg) rotateY(-1.2deg);animation-timing-function:cubic-bezier(.18,.72,.35,1)}10%{transform:perspective(1100px) rotateZ(-6.8deg) rotateX(1.2deg) rotateY(-1.2deg);animation-timing-function:cubic-bezier(.37,0,.63,1)}29%{transform:perspective(1100px) rotateZ(.9deg) rotateX(1.2deg) rotateY(-1.2deg);animation-timing-function:cubic-bezier(.37,0,.63,1)}48%{transform:perspective(1100px) rotateZ(-4.35deg) rotateX(1.2deg) rotateY(-1.2deg);animation-timing-function:cubic-bezier(.37,0,.63,1)}67%{transform:perspective(1100px) rotateZ(-.8deg) rotateX(1.2deg) rotateY(-1.2deg);animation-timing-function:cubic-bezier(.37,0,.63,1)}85%{transform:perspective(1100px) rotateZ(-3.05deg) rotateX(1.2deg) rotateY(-1.2deg);animation-timing-function:cubic-bezier(.37,0,.63,1)}100%{transform:perspective(1100px) rotateZ(-2.2deg) rotateX(1.2deg) rotateY(-1.2deg)}}
@media(prefers-reduced-motion:reduce){.recharge-ticket,.recharge-ticket:hover{animation:none;transform:perspective(1100px) rotateZ(-2.2deg) rotateX(1.2deg) rotateY(-1.2deg)}}
@media(max-width:1050px){.recharge-ticket{width:410px}}
@media(max-width:820px){.recharge-ticket{width:calc(100% - 28px);padding:25px}.ticket-pin{left:64%}.recharge-ticket{transform-origin:64% 0}.ticket-value b{font-size:62px}.ticket-discount{margin-top:-8px;padding:7px 10px 8px}.ticket-discount strong{font-size:19px}.plan-price-row{gap:12px}.plan-monthly-quota{min-width:100px;padding-left:12px}.balance-promo-badge{right:20px;top:20px}}
@media(max-width:420px){.subscription-card .offer-price b{font-size:54px}.subscription-card .offer-price span{font-size:14px}.plan-saving{gap:5px}.plan-saving strong{padding:4px 6px;font-size:12px}.plan-monthly-quota strong{font-size:18px}}
.eyebrow span{animation:model-update-glow 1.9s ease-in-out infinite}
@keyframes model-update-glow{0%,100%{opacity:1;background:#f05a2b;box-shadow:0 0 4px 1px rgba(255,105,58,.72),0 0 11px 2px rgba(239,76,36,.42),0 0 21px 4px rgba(239,76,36,.18);filter:brightness(1)}50%{opacity:1;background:#ff7845;box-shadow:0 0 5px 1px rgba(255,120,69,1),0 0 13px 3px rgba(239,76,36,.68),0 0 24px 5px rgba(239,76,36,.3);filter:brightness(1.2)}}
@media(prefers-reduced-motion:reduce){.eyebrow span{animation:none}}
.faq-answer{white-space:normal}.faq-answer :deep(p){margin:0}.faq-answer :deep(a){color:#243129;font-weight:800;text-decoration:underline;text-decoration-color:rgba(36,49,41,.42);text-underline-offset:3px;transition:color .18s ease,text-decoration-color .18s ease}.faq-answer :deep(a:hover){color:#111713;text-decoration-color:currentColor}
</style>
