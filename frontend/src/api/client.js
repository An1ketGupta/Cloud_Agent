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
