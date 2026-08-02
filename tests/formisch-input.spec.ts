// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import Input from '@/components/ui/input/Input.vue'

describe('Formisch input integration', () => {
  it('registers the native input element through inputRef', () => {
    const inputRef = vi.fn()
    const wrapper = mount(Input, { props: { inputRef } })

    expect(inputRef.mock.calls[0]?.[0]).toBe(wrapper.get('input').element)
  })
})
