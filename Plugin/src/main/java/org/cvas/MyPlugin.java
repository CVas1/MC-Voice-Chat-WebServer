package org.cvas;

import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.event.Listener;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.entity.Player;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.*;
import net.md_5.bungee.api.chat.ClickEvent;
import net.md_5.bungee.api.chat.HoverEvent;
import net.md_5.bungee.api.chat.TextComponent;
import net.md_5.bungee.api.chat.hover.content.Text;
public class MyPlugin extends JavaPlugin implements CommandExecutor, Listener {
    private static final String API_KEY = "NTueHos6cGG55QIFbYlOqANZcCOYWQlqscuWVonyhNodLZlTP6Tdk2TQA3YqAR3KpYjHY86eExDGip0HhD1ClQLYuQWB9dnTPcVm4kaUyW1JUSzrEInllrD2lcUUwhGm5n3PGlYbqaeP25nMwRUuDhvdgH9AWjs9uGIglGWDcw0Jve6jU9uek8Q56Xj9PjTctXfRbLwNXto6I17YwjrIhd0yU09bTVMJFizAMl4wmPEyTl1yH9uMeX2Er3tR4MkjH9sEYUeJIfYT9u9WfGPK4gJt301XtivuMfWeU25CpzzXSiN3Cabn5nRAaqImfDfMkw2gH4ZkGDwB9N9bPwzipAMFn5Vq2Bw90ReqGJxoDp1a07DtpMLHUrGOAshAW3bVvPtCRc5N9fH7QH7Yg2RTjnwW2ZYV8SHCsZ0UlpdDq6XEUwD08qb2XKJFrEERcG5tbFjX5Tg7G83M6tyuaCJzkvuHjtOWguJhUdHkm3E3AqWM7yQVCtVive1jKP1LIPpF";
    private int voiceChatDistance = 30;

    @Override
    public void onEnable() {
        getLogger().info("VoiceChat plugin enabled");
        Bukkit.getPluginManager().registerEvents(this, this);
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (command.getName().equalsIgnoreCase("setvoicechatdistance")) {
            if (sender.isOp()) {
                if (args.length == 1) {
                    try {
                        voiceChatDistance = Integer.parseInt(args[0]);
                        sender.sendMessage("Voice chat distance set to " + voiceChatDistance + " blocks.");
                    } catch (NumberFormatException e) {
                        sender.sendMessage("Invalid number.");
                    }
                } else {
                    sender.sendMessage("Usage: /setvoicechatdistance <blocks>");
                }
                return true;
            } else {
                sender.sendMessage("You must be an admin to use this command.");
                return true;
            }
        } else if (command.getName().equalsIgnoreCase("connectvoicechat")) {
            if (sender instanceof Player) {
                Player player = (Player) sender;
                String token = TokenManager.getToken(player.getUniqueId());
                String url = "http://localhost:3000/?token=" + token;

                // Send token to server
                registerTokenWithServer(token, player.getName());

                // Create clickable message
                TextComponent message = new TextComponent("§a[Click here to join voice chat]");
                message.setClickEvent(new ClickEvent(ClickEvent.Action.OPEN_URL, url));
                message.setHoverEvent(new HoverEvent(HoverEvent.Action.SHOW_TEXT, new Text("§7Open the voice chat in your browser")));

                player.spigot().sendMessage(message);
                return true;
            } else {
                sender.sendMessage("Only players can use this command.");
                return true;
            }
        }

        return false;
    }
    private void registerTokenWithServer(String token, String playerName) {
        // Check if token is null or empty
        if (token == null || token.trim().isEmpty()) {
            getLogger().severe("Token is null or empty for player: " + playerName);
            return;
        }

        // Also check if playerName is valid
        if (playerName == null || playerName.trim().isEmpty()) {
            getLogger().severe("Player name is null or empty");
            return;
        }

        try {
            URL url = new URL("http://localhost:3000/registerToken");
            HttpURLConnection con = (HttpURLConnection) url.openConnection();
            con.setRequestMethod("POST");
            con.setRequestProperty("api-key", API_KEY);
            con.setRequestProperty("Content-Type", "application/json");
            con.setDoOutput(true);

            String json = String.format("{\"token\":\"%s\", \"playerName\":\"%s\"}",
                    token.trim(), playerName.trim());
            getLogger().info("Sending request body: " + json);

            try (OutputStream os = con.getOutputStream()) {
                byte[] input = json.getBytes("utf-8");
                os.write(input, 0, input.length);
                os.flush();
            }

            int code = con.getResponseCode();
            if (code == 200) {
                getLogger().info("Successfully registered token for " + playerName);
            } else {
                getLogger().warning("Failed to register token (code " + code + ")");
                // Also log the response body for debugging
                try (Scanner scanner = new Scanner(con.getErrorStream())) {
                    String response = scanner.useDelimiter("\\A").next();
                    getLogger().warning("Server response: " + response);
                } catch (Exception e) {
                    getLogger().warning("Could not read error response");
                }
            }

        } catch (Exception e) {
            getLogger().warning("Error registering token: " + e.getMessage());
            e.printStackTrace();
        }
    }


    public int getVoiceChatDistance() {
        return voiceChatDistance;
    }

    public boolean isWithinVoiceDistance(Player a, Player b) {
        Location locA = a.getLocation();
        Location locB = b.getLocation();
        return locA.getWorld().equals(locB.getWorld()) && locA.distance(locB) <= voiceChatDistance;
    }
}
