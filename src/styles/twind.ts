'use client'

import { setup } from 'twind'
import presetTailwind from '@twind/preset-tailwind'
import presetAutoprefix from '@twind/preset-autoprefix'

setup({
  presets: [presetAutoprefix(), presetTailwind()],
} as any)

export const twindInitialized = true


