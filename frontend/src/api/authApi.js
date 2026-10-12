import { request } from './client.js';

export const authApi = {
    signUp(details) {
        return request("/auth/signup", {
            method: "POST",
            body: JSON.stringify(details)
        });
    },

    signIn(credentials) {
        return request("/auth/signin", {
            method: "POST",
            body: JSON.stringify(credentials)
        });
    },

    signOut() {
        return request("/auth/signout", {
            method: "POST"
        });
    },

    refresh() {
        return request("/auth/refresh", {
            method: "POST"
        });
    },

    async getProfile() {
        try {
            return await request("/me");
        } catch (error) {
            if (error.status !== 401) {
                throw error;
            }

            await this.refresh();
            return request("/me");
        }
    }
};
