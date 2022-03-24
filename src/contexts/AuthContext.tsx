import Router from "next/router";
import { createContext, ReactNode, useEffect, useState } from "react";

import { parseCookies, setCookie, destroyCookie } from 'nookies'

import { api } from "../services/apiClient";

type User = {
    email: string;
    permissions: string[];
    roles: string[];
}

type AuthProviderProps = {
    children: ReactNode;
}

type SignInCredentials = {
    email: string;
    password: string;
}

type AuthContextData = {
    isAuthenticated: boolean;
    user: User;
    signIn: (credentials: SignInCredentials)=> Promise<void>;
    signOut: () => void;
}

export const AuthContext = createContext({} as AuthContextData)

let authChannel: BroadcastChannel;

export function signOut() {
    destroyCookie(undefined, 'nextauth.token')
    destroyCookie(undefined, 'nextauth.refreshToken')

    authChannel.postMessage('signOut')

    Router.push('/')
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [ user, setUser ] = useState<User>()
    const isAuthenticated = !!user;

    useEffect(() => {
        authChannel = new BroadcastChannel('auth')

        authChannel.onmessage = (message) => {
            switch (message.data) {
                case 'signOut':
                    destroyCookie(undefined, 'nextauth.token');
                    destroyCookie(undefined, 'nextauth.refreshToken');
                    Router.push('/');
                    break;
                case 'signIn':
                    Router.push('/dashboard')
                    break;
                default:
                    break;
            }
        }
    }, [])

    useEffect(() => {
        const { 'nextauth.token': token } =  parseCookies()

        if(token) {
            api.get('/me').then(response => {
                const { email, permissions, roles } = response.data

                setUser({ email, permissions, roles })
            }).catch(() => {
                signOut();
            })
        }
    }, [])

    async function signIn({ email, password }: SignInCredentials) {
        try {
            const response = await api.post('sessions', {
                email,
                password
            })

            const { token, refreshToken, permissions, roles } = response.data
 
            setCookie(undefined, 'nextauth.token', token, {
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: '/' // Whitch paths in my app has access to this cookie
            })

            setCookie(undefined, 'nextauth.refreshToken', refreshToken, {
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: '/' // Whitch paths in my app has access to this cookie
            })

            setUser({
                email,
                permissions,
                roles
            })

            api.defaults.headers['Authorization'] = `Bearer ${token}`

            Router.push('/dashboard')

            authChannel.postMessage('signIn')
        } catch (error) {
            console.log(error)
        }
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, signIn, user, signOut }}>
            { children }
        </AuthContext.Provider>
    )
}
