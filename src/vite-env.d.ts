/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Lemon Squeezy checkout link for the $19 lifetime product, e.g. https://STORE.lemonsqueezy.com/buy/VARIANT-UUID */
  readonly VITE_LS_CHECKOUT_URL?: string
  /** Optional: reject license keys from other Lemon Squeezy products. */
  readonly VITE_LS_PRODUCT_ID?: string
  /** Optional: link to the app's public source (AGPL-3.0 compliance). */
  readonly VITE_SOURCE_URL?: string
}
