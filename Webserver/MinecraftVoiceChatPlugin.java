package org.cvas;

import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerMoveEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitRunnable;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Minecraft Voice Chat Plugin
 *
 * This plugin integrates with the voice chat web server to provide
 * proximity-based voice chat for Minecraft players.
 *
 * Features:
 * - Automatic voice chat link generation for joining players
 * - Real-time position updates for proximity-based volume
 * - Player join/leave notifications to voice server
 */
public class VoiceChat extends JavaPlugin implements Listener {

    private String voiceServerUrl = "http://localhost:3000"; // Change to your Cloudflare tunnel URL
    private HttpClient httpClient;
    private Map<UUID, String> playerVoiceLinks = new ConcurrentHashMap<>();
    private Map<UUID, Long> lastPositionUpdate = new ConcurrentHashMap<>();

    // Minimum time between position updates (milliseconds)
    private static final long POSITION_UPDATE_INTERVAL = 1000; // 1 second

    @Override
    public void onEnable() {
        // Initialize HTTP client
        this.httpClient = HttpClient.newHttpClient();

        // Register event listeners
        getServer().getPluginManager().registerEvents(this, this);

        // Load configuration
        saveDefaultConfig();
        loadConfiguration();

        getLogger().info("Minecraft Voice Chat Plugin enabled!");
        getLogger().info("Voice server URL: " + voiceServerUrl);

        // Start periodic health check
        startHealthCheck();
    }

    @Override
    public void onDisable() {
        getLogger().info("Minecraft Voice Chat Plugin disabled!");
    }

    private void loadConfiguration() {
        reloadConfig();
        this.voiceServerUrl = getConfig().getString("voice-server-url", "http://localhost:3000");

        // Remove trailing slash
        if (voiceServerUrl.endsWith("/")) {
            voiceServerUrl = voiceServerUrl.substring(0, voiceServerUrl.length() - 1);
        }
    }

    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {
        Player player = event.getPlayer();

        // Generate voice chat link asynchronously
        new BukkitRunnable() {
            @Override
            public void run() {
                generateVoiceChatLink(player);
            }
        }.runTaskAsynchronously(this);
    }

    @EventHandler
    public void onPlayerQuit(PlayerQuitEvent event) {
        Player player = event.getPlayer();
        playerVoiceLinks.remove(player.getUniqueId());
        lastPositionUpdate.remove(player.getUniqueId());
    }

    @EventHandler
    public void onPlayerMove(PlayerMoveEvent event) {
        Player player = event.getPlayer();
        UUID playerId = player.getUniqueId();

        // Check if enough time has passed since last update
        long currentTime = System.currentTimeMillis();
        long lastUpdate = lastPositionUpdate.getOrDefault(playerId, 0L);

        if (currentTime - lastUpdate < POSITION_UPDATE_INTERVAL) {
            return;
        }

        // Check if player moved significantly (avoid micro-movements)
        if (event.getFrom().distance(event.getTo()) < 0.5) {
            return;
        }

        lastPositionUpdate.put(playerId, currentTime);

        // Send position update asynchronously
        new BukkitRunnable() {
            @Override
            public void run() {
                updatePlayerPosition(player);
            }
        }.runTaskAsynchronously(this);
    }

    private void generateVoiceChatLink(Player player) {
        try {
            String playerId = player.getUniqueId().toString();
            String username = URLEncoder.encode(player.getName(), StandardCharsets.UTF_8);

            // Create request body
            String requestBody = String.format(
                    "{\"playerId\":\"%s\",\"username\":\"%s\"}",
                    playerId,
                    player.getName()
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(voiceServerUrl + "/api/player/join"))
                    .header("Content-Type", "application/json")
                    .version(HttpClient.Version.HTTP_1_1) // Force HTTP/1.1
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                // Parse response to get voice chat URL
                String responseBody = response.body();

                // Simple JSON parsing (you might want to use a proper JSON library)
                if (responseBody.contains("voiceChatUrl")) {
                    String voiceChatUrl = extractJsonValue(responseBody, "voiceChatUrl");
                    playerVoiceLinks.put(player.getUniqueId(), voiceChatUrl);

                    // Send the link to the player
                    new BukkitRunnable() {
                        @Override
                        public void run() {
                            sendVoiceChatLinkToPlayer(player, voiceChatUrl);
                        }
                    }.runTask(this);
                }
            } else {
                getLogger().warning("Failed to generate voice chat link for " + player.getName() +
                        ". Status: " + response.statusCode());
            }

        } catch (Exception e) {
            getLogger().severe("Error generating voice chat link for " + player.getName() + ": " + e.getMessage());
        }
    }

    private void updatePlayerPosition(Player player) {
        try {
            String requestBody = String.format(
                    "{\"playerId\":\"%s\",\"position\":{\"x\":%.2f,\"y\":%.2f,\"z\":%.2f},\"username\":\"%s\"}",
                    player.getUniqueId().toString(),
                    player.getLocation().getX(),
                    player.getLocation().getY(),
                    player.getLocation().getZ(),
                    player.getName()
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(voiceServerUrl + "/api/player/position"))
                    .header("Content-Type", "application/json")
                    .version(HttpClient.Version.HTTP_1_1) // Force HTTP/1.1
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                getLogger().warning("Failed to update position for " + player.getName() +
                        ". Status: " + response.statusCode());
            }

        } catch (Exception e) {
            getLogger().warning("Error updating position for " + player.getName() + ": " + e.getMessage());
        }
    }

    private void sendVoiceChatLinkToPlayer(Player player, String voiceChatUrl) {
        player.sendMessage("§a=== Minecraft Voice Chat ===");
        player.sendMessage("§7Click the link below to join voice chat:");
        player.sendMessage("§b§n" + voiceChatUrl);
        player.sendMessage("§7Your voice volume will change based on proximity to other players!");
        player.sendMessage("§7Use /voicechat to get the link again.");
    }

    @Override
    public boolean onCommand(org.bukkit.command.CommandSender sender, org.bukkit.command.Command command, String label, String[] args) {
        if (command.getName().equalsIgnoreCase("voicechat")) {
            if (!(sender instanceof Player)) {
                sender.sendMessage("§cThis command can only be used by players!");
                return true;
            }

            Player player = (Player) sender;
            String voiceChatUrl = playerVoiceLinks.get(player.getUniqueId());

            if (voiceChatUrl != null) {
                sendVoiceChatLinkToPlayer(player, voiceChatUrl);
            } else {
                player.sendMessage("§cVoice chat link not available. Try rejoining the server.");
            }

            return true;
        }

        if (command.getName().equalsIgnoreCase("voicechat-reload")) {
            if (!sender.hasPermission("voicechat.admin")) {
                sender.sendMessage("§cYou don't have permission to use this command!");
                return true;
            }

            loadConfiguration();
            sender.sendMessage("§aVoice chat configuration reloaded!");
            return true;
        }

        return false;
    }

    private void startHealthCheck() {
        new BukkitRunnable() {
            @Override
            public void run() {
                checkVoiceServerHealth();
            }
        }.runTaskTimerAsynchronously(this, 20L * 60L, 20L * 60L); // Check every minute
    }

    private void checkVoiceServerHealth() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(voiceServerUrl + "/api/health"))
                    .version(HttpClient.Version.HTTP_1_1) // Force HTTP/1.1
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                getLogger().warning("Voice server health check failed. Status: " + response.statusCode());
            }

        } catch (Exception e) {
            getLogger().warning("Voice server appears to be offline: " + e.getMessage());
        }
    }

    // Simple JSON value extractor (consider using a proper JSON library like Gson)
    private String extractJsonValue(String json, String key) {
        String searchKey = "\"" + key + "\":\"";
        int startIndex = json.indexOf(searchKey);
        if (startIndex == -1) return null;

        startIndex += searchKey.length();
        int endIndex = json.indexOf("\"", startIndex);
        if (endIndex == -1) return null;

        return json.substring(startIndex, endIndex);
    }
}
