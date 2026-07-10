package com.example.llamaproxy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

import java.io.IOException;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class LlamaproxyApplication {

    public static void main(String[] args) {
        SpringApplication.run(LlamaproxyApplication.class, args);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void openBrowser() {
        try {
            new ProcessBuilder("cmd", "/c", "start http://localhost:8081").start();
        } catch (IOException e) {
            System.err.println("Failed to open browser automatically.");
        }
    }
}
