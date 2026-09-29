export async function request(path, options = {}) {
    let response;

    try {
        response = await fetch(path, {
            credentials: "include",
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers
            }
        });
    } catch {
        throw new Error("Could not reach the server. Please try again.");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            data.error || data.message || "Something went wrong."
        );

        error.status = response.status;
        throw error;
    }

    return data;
}

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
