import type { AxiosInstance } from 'axios'

export interface UploadResult {
  url: string
  filename: string
}

export const uploadApi = (client: AxiosInstance) => ({
  uploadFile: (file: File): Promise<UploadResult> => {
    const form = new FormData()
    form.append('file', file)
    return client
      .post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data as unknown as UploadResult)
  },
})
