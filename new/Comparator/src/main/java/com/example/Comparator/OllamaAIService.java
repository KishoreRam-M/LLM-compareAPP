package com.example.Comparator;




import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Service
public class OllamaAIService {

    private final WebClient webClient = WebClient.create("http://localhost:11434");

    public Mono<String> generateResponse(String model, String prompt) {
        return webClient.post()
                .uri("/api/generate")
                .header("Content-Type", "application/json")
                .bodyValue(buildRequest(model, prompt))
                .retrieve()
                .bodyToMono(String.class)
                .map(this::extractFinalText);
    }

    private String buildRequest(String model, String prompt) {
        return """
            {
              "model": "%s",
              "prompt": "%s",
              "stream": false
            }
            """.formatted(model, prompt.replace("\"", "\\\""));
    }

    private String extractFinalText(String rawResponse) {
        // Optional: extract just the 'response' field from JSON
        int start = rawResponse.indexOf("\"response\":\"") + 11;
        int end = rawResponse.indexOf("\"", start);
        if (start > 10 && end > start) {
            return rawResponse.substring(start, end).replace("\\n", "\n");
        }
        return rawResponse;
    }
}
