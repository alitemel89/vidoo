
package com.motorai.video

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                MotorScreen()
            }
        }
    }
}

@Composable
fun MotorScreen() {
    var prompt by remember { mutableStateOf("") }
    var duration by remember { mutableIntStateOf(5) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        Text(
            "MOTOR AI",
            style = MaterialTheme.typography.headlineLarge
        )

        Text("Hayal gücünü çalıştır.")

        Text(
            "Nasıl bir video hayal ediyorsun?",
            style = MaterialTheme.typography.titleMedium
        )

        OutlinedTextField(
            value = prompt,
            onValueChange = { prompt = it },
            label = { Text("Videonu anlat") },
            placeholder = {
                Text("Gün batımında sahilde yürüyen bir kedi...")
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(150.dp)
        )

        Text("Video süresi")

        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            listOf(5, 10).forEach { seconds ->
                FilterChip(
                    selected = duration == seconds,
                    onClick = { duration = seconds },
                    label = { Text("$seconds saniye") }
                )
            }
        }

        Button(
            onClick = {},
            enabled = false,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Motoru Çalıştır")
        }

        Text(
            "Video üretimi API bağlantısından sonra açılacak.",
            style = MaterialTheme.typography.bodySmall
        )
    }
}
