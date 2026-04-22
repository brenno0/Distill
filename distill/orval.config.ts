import { defineConfig } from 'orval'

export default defineConfig({
  distill: {
    input: 'http://localhost:8000/openapi.json',
    output: {
      mode: 'tags-split',
      target: 'src/renderer/src/lib/api/generated',
      client: 'axios',
      override: {
        mutator: {
          path: 'src/renderer/src/lib/axios.ts',
          name: 'axiosInstance',
        },
      },
    },
  },
})
