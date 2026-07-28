<template>
  <div v-if="open" class="fixed inset-0 z-[100] flex items-center justify-center bg-transparent p-4" @click.self="emit('close')">
    <div class="w-full max-w-[380px] rounded-lg bg-white p-4 shadow-xl dark:bg-dark-800">
      <div v-if="loading" class="flex h-52 items-center justify-center text-sm text-gray-500">
        {{ t('common.loading') }}
      </div>
      <template v-else-if="challenge">
        <Slide
          v-if="challenge.type === 'slide'"
          :data="slideData"
          :events="slideEvents"
        />
        <SlideRegion
          v-else-if="challenge.type === 'drag'"
          :data="slideData"
          :events="slideEvents"
        />
        <Rotate
          v-else-if="challenge.type === 'rotate'"
          :data="rotateData"
          :events="rotateEvents"
        />
        <Click
          v-else
          :data="clickData"
          :events="clickEvents"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Click, Rotate, Slide, SlideRegion } from 'go-captcha-vue'
import 'go-captcha-vue/dist/style.css'
import { createCaptchaChallenge, verifyCaptchaChallenge, type CaptchaChallenge } from '@/api/auth'
import { useAppStore } from '@/stores'

const props = defineProps<{ open: boolean; action: string; target: string }>()
const emit = defineEmits<{ verified: [proof: string]; close: [] }>()
const { t } = useI18n()
const appStore = useAppStore()
const loading = ref(false)
const challenge = ref<CaptchaChallenge | null>(null)
const verifying = ref(false)

const slideData = computed(() => ({
  image: challenge.value?.image || '',
  thumb: challenge.value?.thumb || '',
  thumbX: challenge.value?.thumb_x || 0,
  thumbY: challenge.value?.thumb_y || 0,
  thumbWidth: challenge.value?.thumb_width || 0,
  thumbHeight: challenge.value?.thumb_height || 0
}))
const rotateData = computed(() => ({ image: challenge.value?.image || '', thumb: challenge.value?.thumb || '', thumbSize: challenge.value?.thumb_size || 0 }))
const clickData = computed(() => ({ image: challenge.value?.image || '', thumb: challenge.value?.thumb || '' }))

async function loadChallenge(): Promise<void> {
  if (!props.target) return
  loading.value = true
  try { challenge.value = await createCaptchaChallenge(props.action, props.target) }
  catch (error: any) { appStore.showError(error?.response?.data?.message || t('auth.turnstileFailed')); emit('close') }
  finally { loading.value = false }
}

async function verify(answer: Record<string, unknown>): Promise<void> {
  if (!challenge.value || verifying.value) return
  verifying.value = true
  try {
    const proof = await verifyCaptchaChallenge(challenge.value.id, answer)
    emit('verified', proof)
  } catch (error: any) {
    appStore.showError(error?.response?.data?.message || t('auth.completeVerification'))
    // A challenge is consumed by every verification attempt, successful or not.
    challenge.value = null
    await loadChallenge()
  } finally { verifying.value = false }
}

const slideEvents = { refresh: loadChallenge, close: () => emit('close'), confirm: (point: { x: number; y: number }) => { void verify({ x: point.x, y: point.y }); return false } }
const rotateEvents = { refresh: loadChallenge, close: () => emit('close'), confirm: (angle: number) => { void verify({ angle }); return false } }
const clickEvents = { refresh: loadChallenge, close: () => emit('close'), confirm: (dots: Array<{ x: number; y: number }>) => { void verify({ dots: dots.map(({ x, y }) => ({ x, y })) }); return false } }

watch(() => props.open, (open) => { if (open) void loadChallenge(); else challenge.value = null })
</script>
