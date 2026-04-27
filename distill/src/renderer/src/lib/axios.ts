import axios, { type AxiosRequestConfig } from 'axios'

// Vite replaces import.meta.env at build time; fallback for Node/Orval context
const BASE_URL = 'http://localhost:47821'

const instance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Orval requires the mutator to be a callable function
export const axiosInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  return instance(config).then((res) => res.data)
}
