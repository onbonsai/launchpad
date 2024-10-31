import axios from 'axios'

const httpClient = axios.create({
  headers: {
    'content-type': 'application/json',
  },
})

httpClient.interceptors.response.use(
  (response) => {
    if (response.data.errors) {
      return Promise.reject(response.data.errors)
    }
    return response
  },
  async (error) => {
    return Promise.reject(error)
  }
)

export { httpClient }
