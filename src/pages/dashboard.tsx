import { useContext, useEffect } from "react"

import { AuthContext } from "../contexts/AuthContext"

import { api } from "../services/apiClient";
import { setUpAPIClient } from "../services/api";

import { withSSRAuth } from "../utils/withSSRAuth"
import { useCan } from "../hooks/useCan";

export default function Dashboard() {
    const { user } = useContext(AuthContext)

    const userCanSeeMetrics = useCan({
        roles: ['administrator', 'editor']
    })

    useEffect(() => {
        api.get('/me')
            .then(response => console.log(response))
            .catch(error => console.log(error))
    }, [])

    return (
        <>
            <h1>Hello, { user?.email }</h1>
            { userCanSeeMetrics && <div>Metricas</div> }
        </>
    )
}

export const getServerSideProps = withSSRAuth(async (ctx) => {
    const apiClient = setUpAPIClient(ctx);
    const response = await apiClient.get('/me');

    console.log(response.data)

    return {
        props: {}
    }
})