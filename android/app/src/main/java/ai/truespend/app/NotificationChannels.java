package ai.truespend.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

public class NotificationChannels {
    
    public static void createNotificationChannels(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = 
                context.getSystemService(NotificationManager.class);
            
            // General Channel
            NotificationChannel generalChannel = new NotificationChannel(
                "general",
                "General",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            generalChannel.setDescription("General app notifications");
            notificationManager.createNotificationChannel(generalChannel);
            
            // Budget Alerts Channel
            NotificationChannel budgetChannel = new NotificationChannel(
                "budget_alert",
                "Budget Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            budgetChannel.setDescription("Notifications when you approach or exceed budget limits");
            budgetChannel.enableLights(true);
            budgetChannel.enableVibration(true);
            notificationManager.createNotificationChannel(budgetChannel);
            
            // Geofence Reminders Channel
            NotificationChannel geofenceChannel = new NotificationChannel(
                "geofence_reminder",
                "Location Reminders",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            geofenceChannel.setDescription("Notifications when you enter or leave important locations");
            notificationManager.createNotificationChannel(geofenceChannel);
            
            // Transaction Alerts Channel
            NotificationChannel transactionChannel = new NotificationChannel(
                "transaction_alert",
                "Transaction Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            transactionChannel.setDescription("Notifications for new transactions and purchases");
            transactionChannel.enableLights(true);
            transactionChannel.enableVibration(true);
            notificationManager.createNotificationChannel(transactionChannel);
        }
    }
}
