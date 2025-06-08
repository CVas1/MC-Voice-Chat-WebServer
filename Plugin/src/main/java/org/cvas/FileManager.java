package org.cvas;

import org.bukkit.Location;
import org.bukkit.command.CommandExecutor;
import org.bukkit.entity.Player;
import org.bukkit.event.Listener;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.FileWriter;
import java.io.IOException;

public class FileManager extends JavaPlugin implements CommandExecutor, Listener {
    private static final String FILE_PATH = "plugins/VoiceChat/tokens.txt";

    public static String getFilePath() {
        return FILE_PATH;
    }

    public static void FileCreate() {
        java.io.File tokenFile = new java.io.File(FILE_PATH);
        //clean txt
        if (tokenFile.exists()) {
            try (FileWriter writer = new FileWriter(tokenFile, false)) {
                writer.write(""); // Clear the file
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }


    public static void saveTokenToFile(String token, Player player) {
        if (token == null || token.trim().isEmpty()) {
            return;
        }

        Location loc = player.getLocation();
        String entry = String.format("%s,%s,%.2f,%.2f,%.2f%n",
                player.getName(), token.trim(), loc.getX(), loc.getY(), loc.getZ());

        java.io.File tokenFile = new java.io.File(FILE_PATH);
        try {
            if (!tokenFile.exists()) {
                tokenFile.getParentFile().mkdirs();
                tokenFile.createNewFile();
            }

            // Remove existing line for this player
            java.util.List<String> lines = java.nio.file.Files.readAllLines(tokenFile.toPath());
            String playerName = player.getName();
            lines.removeIf(line -> {
                String[] parts = line.split(",");
                return parts.length >= 2 && parts[0].equals(playerName);
            });
            lines.add(entry.trim()); // add new entry (trim to remove extra newline)
            java.nio.file.Files.write(tokenFile.toPath(), lines, java.nio.file.StandardOpenOption.TRUNCATE_EXISTING);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void updatePlayers(Iterable<? extends Player> players) {
        java.io.File tokenFile = new java.io.File(FILE_PATH);
        if (!tokenFile.exists()) return;

        try {
            java.util.List<String> lines = java.nio.file.Files.readAllLines(tokenFile.toPath());
            java.util.Map<String, Location> playerLocations = new java.util.HashMap<>();
            for (Player player : players) {
                playerLocations.put(player.getName(), player.getLocation());
            }
            boolean updated = false;
            for (int i = 0; i < lines.size(); i++) {
                String[] parts = lines.get(i).split(",");
                if (parts.length >= 5) {
                    Location loc = playerLocations.get(parts[0]);
                    if (loc != null) {
                        parts[2] = String.format("%.2f", loc.getX());
                        parts[3] = String.format("%.2f", loc.getY());
                        parts[4] = String.format("%.2f", loc.getZ());
                        lines.set(i, String.join(",", parts));
                        updated = true;
                    }
                }
            }
            if (updated) {
                java.nio.file.Files.write(tokenFile.toPath(), lines);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void removePlayer(Player player) {
        java.io.File tokenFile = new java.io.File(FILE_PATH);
        if (!tokenFile.exists()) return;

        try {
            java.util.List<String> lines = java.nio.file.Files.readAllLines(tokenFile.toPath());
            String playerName = player.getName();
            boolean removed = lines.removeIf(line -> {
                String[] parts = line.split(",");
                return parts.length >= 2 && parts[0].equals(playerName);
            });
            if (removed) {
                java.nio.file.Files.write(tokenFile.toPath(), lines);
                // Logging is not available in static context
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

}
