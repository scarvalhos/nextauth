import type { GetServerSideProps, NextPage } from 'next'
import { FormEvent, useContext, useState } from 'react'

import { parseCookies } from 'nookies'

import { AuthContext } from '../contexts/AuthContext'

import styles from '../styles/Home.module.css'

const Home: NextPage = () => {
  const [ email, setEmail ] = useState('') 
  const [ password, setPassword ] = useState('') 

  const { signIn } = useContext(AuthContext)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const data = {
      email,
      password
    }

    await signIn(data)
  }

  return (
    <form onSubmit={handleSubmit} className={styles.container}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)}/>
      <button type="submit">Entrar</button>
    </form>
  )
}

export default Home

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const cookies = parseCookies(ctx)

  if(cookies['nextauth.token']) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false
      }
    }
  }

  return {
    props: {}
  }
}