package com.chefos.app;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "ChefArchivos")
public class ArchivosPlugin extends Plugin {
  @PluginMethod public void guardar(PluginCall call) {
    String nombre = call.getString("nombre", "plantilla-chefos.csv");
    String contenido = call.getString("contenido", "");
    if (!nombre.matches("[a-zA-Z0-9_.-]+\\.csv") || contenido.length() > 1000000) {
      call.reject("Archivo inválido o demasiado grande."); return;
    }
    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType("text/csv");
    intent.putExtra(Intent.EXTRA_TITLE, nombre);
    try { startActivityForResult(call, intent, "guardado"); }
    catch (Exception e) { call.reject("No hay un selector de archivos disponible."); }
  }
  @ActivityCallback private void guardado(PluginCall call, ActivityResult result) {
    if (call == null) return;
    if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
      call.reject("Guardado cancelado."); return;
    }
    try (OutputStream stream = getContext().getContentResolver().openOutputStream(result.getData().getData(), "wt")) {
      if (stream == null) throw new Exception("Destino no disponible");
      stream.write(call.getString("contenido", "").getBytes(StandardCharsets.UTF_8));
      stream.flush(); call.resolve();
    } catch (Exception e) { call.reject("No se pudo guardar. Comprueba espacio y permisos del destino."); }
  }
}
