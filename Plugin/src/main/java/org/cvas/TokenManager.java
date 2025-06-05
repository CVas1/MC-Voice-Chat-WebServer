package org.cvas;

import java.util.HashMap;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

public class TokenManager {
    private static final HashMap<UUID, String> tokens = new HashMap<>();

    public static String getToken(UUID uuid) {
        return tokens.computeIfAbsent(uuid, k -> generateToken());
    }

    public static boolean isValidToken(String token) {
        return tokens.containsValue(token);
    }

    private static String generateToken() {
        return Long.toHexString(ThreadLocalRandom.current().nextLong());
    }
}
