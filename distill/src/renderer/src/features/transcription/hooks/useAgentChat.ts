import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { getAgent } from '@renderer/lib/api/generated/agent/agent'
import { useSettingsStore } from '@renderer/stores/useSettingsStore'

const agentApi = getAgent()

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function useAgentChat(transcriptionId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const provider = useSettingsStore((s) => s.provider)
  const model = useSettingsStore((s) => s.model)

  const sendMutation = useMutation({
    mutationFn: (message: string) =>
      agentApi.agentChatApiV1AgentChatPost({
        message,
        transcription_id: transcriptionId,
        llm_provider: provider,
        llm_model: model,
      }),
    onMutate: (message) => {
      setMessages((prev) => [...prev, { role: 'user', content: message }])
      setInput('')
    },
    onSuccess: (data: any) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response ?? '' }])
    },
    onError: () => {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }])
    },
  })

  const send = () => {
    if (!input.trim() || sendMutation.isPending) return
    sendMutation.mutate(input.trim())
  }

  const clearMessages = () => setMessages([])

  return { messages, input, setInput, send, clearMessages, isPending: sendMutation.isPending }
}
