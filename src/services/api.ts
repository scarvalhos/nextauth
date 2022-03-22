import axios, { AxiosError } from 'axios'

import { parseCookies, setCookie } from 'nookies'

import { signOut } from '../contexts/AuthContext';
import { AuthTokenError } from './errors/AuthTokenError';

let isRefreshing = false;
let failedRequestQueue = [];

export function setUpAPIClient(ctx = undefined) {
    let cookies = parseCookies(ctx);

    const api = axios.create({
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
                cookies = parseCookies(ctx); // Get updated cookies
    
                const { 'nextauth.refreshToken': refreshToken } = cookies;
                const originalConfig = error.config;
    
                if(!isRefreshing) {
                    isRefreshing = true
    
                    api.post('/refresh', {
                        refreshToken
                    }).then(response => {
                        const { token } = response.data;
        
                        // Save new token and refresh token in cookie
        
                        setCookie(ctx, 'nextauth.token', token, {
                            maxAge: 60 * 60 * 24 * 30, // 30 days
                            path: '/' // Whitch paths in my app has access to this cookie
                        })
            
                        setCookie(ctx, 'nextauth.refreshToken', response.data.refreshToken, {
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
    
                        if(typeof window !== 'undefined') {
                            signOut()
                        }
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
                if(typeof window !== 'undefined') {
                    signOut();
                } else {
                    return Promise.reject(new AuthTokenError())
                }
            }
        }
    
        return Promise.reject(error);
    })

    return api;
}
