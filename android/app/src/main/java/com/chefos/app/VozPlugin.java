package com.chefos.app;

import android.app.Activity;
import android.content.Intent;
import android.speech.RecognizerIntent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;

@CapacitorPlugin(name = "ChefVoz")
public class VozPlugin extends Plugin {
  @PluginMethod
  public void escuchar(PluginCall call) {
    Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-CL");
    intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Ejemplo: registra 2 porciones de congrio como merma");
    try { startActivityForResult(call, intent, "resultado"); }
    catch (Exception e) { call.reject("El teléfono no tiene dictado disponible. Puedes escribir el comando o usar el micrófono del teclado."); }
  }
  @ActivityCallback
  private void resultado(PluginCall call, ActivityResult result) {
    if (call == null) return;
    if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { call.reject("Dictado cancelado."); return; }
    ArrayList<String> frases = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
    if (frases == null || frases.isEmpty()) { call.reject("No se entendió la frase. Intenta nuevamente."); return; }
    JSObject data = new JSObject(); data.put("texto", frases.get(0)); call.resolve(data);
  }
}
