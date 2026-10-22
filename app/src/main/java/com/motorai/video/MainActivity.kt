
package com.motorai.video

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val background = Color(0xFF170F0B)
private val surface = Color(0xFF2A1D17)
private val surfaceLight = Color(0xFF38271E)
private val copper = Color(0xFFE8A467)
private val cream = Color(0xFFFFEBD6)
private val muted = Color(0xFFC5A994)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.rgb(23, 15, 11)
        window.navigationBarColor = android.graphics.Color.rgb(23, 15, 11)
        setContent { MotorApp() }
    }
}

@Composable
fun MotorApp() {
    var prompt by remember { mutableStateOf("") }
    var duration by remember { mutableIntStateOf(5) }
    var ratio by remember { mutableStateOf("9:16") }
    var quality by remember { mutableStateOf("Standart") }

    val styles = listOf(
        "🎬" to "Sinematik",
        "📷" to "Gerçekçi",
        "✨" to "Animasyon",
        "🌿" to "Doğa",
        "🚀" to "Bilim Kurgu",
        "☕" to "Nostaljik"
    )

    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = copper,
            background = background,
            surface = surface,
            onSurface = cream
        )
    ) {
        Box(
            Modifier.fillMaxSize().background(
                Brush.verticalGradient(
                    listOf(Color(0xFF362016), background, background)
                )
            )
        ) {
            Column(
                Modifier.fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp, vertical = 22.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(
                            "▣ MOTOR AI",
                            color = cream,
                            fontSize = 23.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            "Hayal gücünü çalıştır.",
                            color = muted,
                            fontSize = 12.sp
                        )
                    }

                    Box(
                        Modifier.background(
                            surfaceLight,
                            RoundedCornerShape(24.dp)
                        ).padding(horizontal = 13.dp, vertical = 9.dp)
                    ) {
                        Text("✦ Krediler", color = copper)
                    }
                }

                Spacer(Modifier.height(5.dp))

                Text(
                    "Fikrini videoya\ndönüştür.",
                    color = cream,
                    fontSize = 35.sp,
                    lineHeight = 40.sp,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    "Hayal ettiğin sahneyi anlat, yapay zekâ canlandırsın.",
                    color = muted,
                    fontSize = 14.sp
                )

                Panel {
                    Text(
                        "✎ Videonu anlat",
                        color = cream,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(Modifier.height(12.dp))

                    Box(
                        Modifier.fillMaxWidth()
                            .heightIn(min = 135.dp)
                            .background(background, RoundedCornerShape(16.dp))
                            .border(
                                1.dp,
                                Color(0xFF604433),
                                RoundedCornerShape(16.dp)
                            )
                            .padding(15.dp)
                    ) {
                        if (prompt.isEmpty()) {
                            Text(
                                "Gün batımında sahilde yürüyen bir kedi, sinematik ışıklar...",
                                color = muted,
                                fontSize = 14.sp
                            )
                        }

                        BasicTextField(
                            value = prompt,
                            onValueChange = { prompt = it },
                            modifier = Modifier.fillMaxWidth(),
                            textStyle = androidx.compose.ui.text.TextStyle(
                                color = cream,
                                fontSize = 15.sp
                            ),
                            cursorBrush = Brush.verticalGradient(
                                listOf(copper, copper)
                            )
                        )
                    }

                    Spacer(Modifier.height(12.dp))
                    Text(
                        "✦ Sahneni olabildiğince ayrıntılı anlat",
                        color = muted,
                        fontSize = 12.sp
                    )
                }

                Panel {
                    Text("◷ Video süresi", color = cream)
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                        listOf(5, 10).forEach { n ->
                            Choice(
                                "$n saniye",
                                duration == n,
                                Modifier.weight(1f)
                            ) { duration = n }
                        }
                    }
                }

                Panel {
                    Text("▣ Görüntü oranı", color = cream)
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                        listOf("9:16", "16:9", "1:1").forEach { value ->
                            Choice(
                                value,
                                ratio == value,
                                Modifier.weight(1f)
                            ) { ratio = value }
                        }
                    }
                }

                Panel {
                    Text("✧ Video kalitesi", color = cream)
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                        listOf("Standart", "Yüksek").forEach { value ->
                            Choice(
                                value,
                                quality == value,
                                Modifier.weight(1f)
                            ) { quality = value }
                        }
                    }
                }

                Box(
                    Modifier.fillMaxWidth()
                        .height(58.dp)
                        .background(
                            Brush.horizontalGradient(
                                listOf(
                                    Color(0xFFB56D39),
                                    copper,
                                    Color(0xFFC47A45)
                                )
                            ),
                            RoundedCornerShape(19.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "✦ Motoru Çalıştır →",
                        color = Color(0xFF2A170E),
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Text(
                    "Video üretimi yakında etkinleştirilecek.",
                    color = muted,
                    fontSize = 12.sp
                )

                Text(
                    "Hazır tarzlar",
                    color = cream,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )

                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(styles) { (emoji, name) ->
                        Column(
                            Modifier.width(125.dp)
                                .background(
                                    surface,
                                    RoundedCornerShape(16.dp)
                                )
                                .clickable {
                                    prompt = when (name) {
                                        "Sinematik" ->
                                            "Altın saat ışığında sinematik bir şehir manzarası"
                                        "Gerçekçi" ->
                                            "Gerçekçi, doğal ışıkta çekilmiş etkileyici bir sahne"
                                        "Animasyon" ->
                                            "Renkli ve sevimli bir animasyon dünyası"
                                        "Doğa" ->
                                            "Sisli dağlar ve ormanlar arasında huzurlu bir manzara"
                                        "Bilim Kurgu" ->
                                            "Uzak bir gezegende sinematik bilim kurgu sahnesi"
                                        else ->
                                            "Sıcak ışıklı nostaljik bir kafede kahve fincanı"
                                    }
                                }
                                .padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Box(
                                Modifier.fillMaxWidth()
                                    .height(76.dp)
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(
                                                Color(0xFF86502F),
                                                Color(0xFF362017)
                                            )
                                        ),
                                        RoundedCornerShape(12.dp)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(emoji, fontSize = 32.sp)
                            }

                            Spacer(Modifier.height(8.dp))

                            Text(
                                name,
                                color = cream,
                                fontSize = 13.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }

                Spacer(Modifier.height(20.dp))
            }
        }
    }
}

@Composable
private fun Panel(
    content: @Composable ColumnScope.() -> Unit
) {
    Column(
        Modifier.fillMaxWidth()
            .background(surface, RoundedCornerShape(20.dp))
            .border(
                1.dp,
                Color(0xFF503729),
                RoundedCornerShape(20.dp)
            )
            .padding(16.dp),
        content = content
    )
}

@Composable
private fun Choice(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Box(
        modifier.height(43.dp)
            .background(
                if (selected) copper else surfaceLight,
                RoundedCornerShape(12.dp)
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            label,
            color = if (selected) Color(0xFF27160D) else cream,
            fontSize = 13.sp,
            fontWeight = if (selected) FontWeight.Bold
                         else FontWeight.Normal
        )
    }
}
