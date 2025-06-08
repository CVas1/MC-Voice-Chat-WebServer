package org.cvas;

import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;

import net.md_5.bungee.api.chat.ClickEvent;
import net.md_5.bungee.api.chat.HoverEvent;
import net.md_5.bungee.api.chat.TextComponent;
import net.md_5.bungee.api.chat.hover.content.Text;

public class VoiceChat extends JavaPlugin implements CommandExecutor, Listener {
    private static final String API_KEY = "NTueHos6cGG55QIFbYlOqANZcCOYWQlqscuWVonyhNodLZlTP6Tdk2TQA3YqAR3KpYjHY86eExDGip0HhD1ClQLYuQWB9dnTPcVm4kaUyW1JUSzrEInllrD2lcUUwhGm5n3PGlYbqaeP25nMwRUuDhvdgH9AWjs9uGIglGWDcw0Jve6jU9uek8Q56Xj9PjTctXfRbLwNXto6I17YwjrIhd0yU09bTVMJFizAMl4wmPEyTl1yH9uMeX2Er3tR4MkjH9sEYUeJIfYT9u9WfGPK4gJt301XtivuMfWeU25CpzzXSiN3Cabn5nRAaqImfDfMkw2gH4ZkGDwB9N9bPwzipAMFn5Vq2Bw90ReqGJxoDp1a07DtpMLHUrGOAshAW3bVvPtCRc5N9fH7QH7Yg2RTjnwW2ZYV8SHCsZ0UlpdDq6XEUwD08qb2XKJFrEERcG5tbFjX5Tg7G83M6tyuaCJzkvuHjtOWguJhUdHkm3E3AqWM7yQVCtVive1jKP1LIPpF";
    private int voiceChatDistance = 30;

    @Override
    public void onEnable() {
        getLogger().info("VoiceChat plugin enabled");
        Bukkit.getPluginManager().registerEvents(this, this);

        // Schedule repeating task to update player positions every second (20 ticks)
        Bukkit.getScheduler().runTaskTimer(this, () -> {
            FileManager.updatePlayers(Bukkit.getOnlinePlayers());
        }, 0L, 20L); // 0 tick delay, repeat every 20 ticks (1 second)
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (command.getName().equalsIgnoreCase("setvoicechatdistance")) {
            return handleSetVoiceChatDistance(sender, args);
        } else if (command.getName().equalsIgnoreCase("connectvoicechat")) {
            return handleConnectVoiceChat(sender);
        }
        return false;
    }

    @EventHandler
    public void onPlayerQuit(PlayerQuitEvent event) {
        Player player = event.getPlayer();
        FileManager.removePlayer(player);
    }

    private boolean handleSetVoiceChatDistance(CommandSender sender, String[] args) {
        if (!sender.isOp()) {
            sender.sendMessage("You must be an admin to use this command.");
            return true;
        }
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
    }

    private boolean handleConnectVoiceChat(CommandSender sender) {
        if (!(sender instanceof Player)) {
            sender.sendMessage("Only players can use this command.");
            return true;
        }
        Player player = (Player) sender;
        String token = TokenManager.getToken(player.getUniqueId());
        String url = "http://localhost:3000/?token=" + token;

        // Send token to server
        FileManager.saveTokenToFile(token, player);

        // Create clickable message
        TextComponent message = new TextComponent("§a[Click here to join voice chat]");
        message.setClickEvent(new ClickEvent(ClickEvent.Action.OPEN_URL, url));
        message.setHoverEvent(new HoverEvent(HoverEvent.Action.SHOW_TEXT, new Text("§7Open the voice chat in your browser")));

        player.spigot().sendMessage(message);
        return true;
    }


}
