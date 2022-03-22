import axios, { AxiosError } from 'axios'

import { parseCookies, setCookie } from 'nookies'

import { signOut } from '../contexts/AuthContext';

let cookies = parseCookies();
let isRefreshing = false;
let failedRequestQueue = [];

export const api = axios.create({
    baseURL: 'http://localhost:3333',
    headers: {
        Authorization: `Bearer ${cookies['nextauth.token']}`
    }
})

api.interceptors.response.use(response => {
    return response;
}, (error: AxiosError) => {
    if(error.response.status === 401) {
        if(error.response.data?.code === 'token.expired') {
            // Refresh token
            cookies = parseCookies(); // Get updated cookies

            const { 'nextauth.refreshToken': refreshToken } = cookies;
            const originalConfig = error.config;

            if(!isRefreshing) {
                isRefreshing = true

                api.post('/refresh', {
                    refreshToken
                }).then(response => {
                    const { token } = response.data;
    
                    // Save new token and refresh token in cookie
    
                    setCookie(undefined, 'nextauth.token', token, {
                        maxAge: 60 * 60 * 24 * 30, // 30 days
                        path: '/' // Whitch paths in my app has access to this cookie
                    })
        
                    setCookie(undefined, 'nextauth.refreshToken', response.data.refreshToken, {
                        maxAge: 60 * 60 * 24 * 30, // 30 days
                        path: '/' // Whitch paths in my app has access to this cookie
                    })
    
                    // Update token header
                    api.defaults.headers['Authorization'] = `Bearer ${token}`

                    failedRequestQueue.forEach(request => request.onSuccess(token))
                    failedRequestQueue = [];
                }).catch(err => {
                    failedRequestQueue.forEach(request => request.onFailure(err))
                    failedRequestQueue = [];
                }).finally(() => {
                    isRefreshing = false
                })
            }

            return new Promise((resolve, reject) => {
                failedRequestQueue.push({
                    // Case refresh token success
                    onSuccess: (token: string) => {
                        originalConfig.headers['Authorization'] = `Bearer ${token}`

                        resolve(api(originalConfig))
                    },
                    // Case refresh token failed
                    onFailure: (err: AxiosError) => {
                        reject(err)
                    },
                })
            })
        } else {
            // Logout user
            signOut();
        }
    }

    return Promise.reject(error);
})