// HealthCheckDebug.java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class HealthCheckDebug {
    public static void main(String[] args) {
        String voiceServerUrl = "http://localhost:3000"; // Change if needed
        String healthUrl = voiceServerUrl + "/api/health";
        System.out.println("Sending health check request to: " + healthUrl);

        try {
            HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(healthUrl))
        .version(HttpClient.Version.HTTP_1_1) // Force HTTP/1.1
        .GET()
        .build();

            HttpClient client = HttpClient.newHttpClient();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            System.out.println("Status code: " + response.statusCode());
            System.out.println("Response body: " + response.body());
        } catch (Exception e) {
            System.err.println("Error during health check: " + e.getMessage());
            e.printStackTrace();
        }
    }
}