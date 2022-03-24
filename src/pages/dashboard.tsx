import { useContext, useEffect } from "react";

import { AuthContext } from "../contexts/AuthContext";

import { api } from "../services/apiClient";
import { setUpAPIClient } from "../services/api";

import { withSSRAuth } from "../utils/withSSRAuth";
import { Can } from "../components/Can";

export default function Dashboard() {
    const { user, signOut } = useContext(AuthContext)

    useEffect(() => {
        api.get('/me')
            .then(response => console.log(response))
            .catch(error => console.log(error))
    }, [])

    return (
        <>
            <h1>Hello, { user?.email }</h1>

            <button onClick={signOut}>Sign Out</button>
            
            <Can permissions={['metrics.list']}>
                <div>Metricas</div>
            </Can>
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
