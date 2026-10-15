package id.jeniusedu.app;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.*;
import android.print.PrintManager;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import java.io.*;
import java.util.*;

public final class MainActivity extends Activity {
 private static final String ORIGIN="https://panel-baru-jenius-edu.vercel.app";
 private static final int FILE_PICK=100, FILE_SAVE=101;
 private FrameLayout root; private LinearLayout page; private WebView web;
 private final ArrayList<WebView> popups=new ArrayList<>();
 private ValueCallback<Uri[]> chooser; private byte[] pendingBytes;
 private String supportScript="", lastUrl=ORIGIN+"/";
 private ProgressBar progress;
 private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
 private TextView text(String value,int size,int color){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(color);return t;}
 @Override public void onCreate(Bundle state){super.onCreate(state);root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(237,247,255));setContentView(root);
  if(Build.VERSION.SDK_INT>=30){getWindow().setDecorFitsSystemWindows(false);root.setOnApplyWindowInsetsListener((v,insets)->{android.graphics.Insets i=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());v.setPadding(i.left,i.top,i.right,i.bottom);return insets;});}
  try(InputStream in=getAssets().open("web-support.js")){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[4096];int n;while((n=in.read(buf))!=-1)out.write(buf,0,n);supportScript=out.toString("UTF-8");}catch(IOException ignored){}
  openPortal();
  if(state!=null&&state.getString("url")!=null&&trusted(Uri.parse(state.getString("url"))))web.loadUrl(state.getString("url"));
 }
 private void openPortal(){root.removeAllViews();page=new LinearLayout(this);page.setOrientation(1);root.addView(page,new FrameLayout.LayoutParams(-1,-1));
  progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);progress.setMax(100);page.addView(progress,new LinearLayout.LayoutParams(-1,dp(2)));
  web=new WebView(this);configure(web);page.addView(web,new LinearLayout.LayoutParams(-1,0,1));web.loadUrl(ORIGIN+"/");
 }
 private boolean trusted(Uri uri){return uri!=null&&"https".equals(uri.getScheme())&&"panel-baru-jenius-edu.vercel.app".equals(uri.getHost());}
 private void configure(WebView view){WebSettings s=view.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(true);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setSupportMultipleWindows(true);s.setJavaScriptCanOpenWindowsAutomatically(true);s.setLoadWithOverviewMode(true);s.setUseWideViewPort(true);s.setBuiltInZoomControls(false);view.setBackgroundColor(Color.WHITE);CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(view,false);
  view.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest request){return route(v,request.getUrl(),request.isForMainFrame());}
   @Override public void onPageFinished(WebView v,String url){if(trusted(Uri.parse(url))||("about:blank".equals(url)&&popups.contains(v))){v.evaluateJavascript(supportScript,null);}if(v==web&&trusted(Uri.parse(url)))lastUrl=url;CookieManager.getInstance().flush();}
   @Override public void onReceivedSslError(WebView v,SslErrorHandler handler,SslError error){handler.cancel();Toast.makeText(MainActivity.this,"Koneksi aman belum tersedia. Coba lagi nanti.",Toast.LENGTH_LONG).show();}
   @Override public void onReceivedError(WebView v,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame()&&v==web){progress.setVisibility(View.GONE);new AlertDialog.Builder(MainActivity.this).setTitle("Belum dapat terhubung").setMessage("Periksa internet Anda, lalu coba muat ulang.").setPositiveButton("Coba lagi",(d,w)->v.loadUrl(lastUrl)).setNegativeButton("Tutup",(d,w)->finish()).show();}}
  });
  view.setWebChromeClient(new WebChromeClient(){
   @Override public void onProgressChanged(WebView v,int value){if(progress!=null){progress.setProgress(value);progress.setVisibility(value==100?View.GONE:View.VISIBLE);}if(value==100&&(trusted(Uri.parse(v.getUrl()==null?"":v.getUrl()))||popups.contains(v)))v.evaluateJavascript(supportScript,null);}
   @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){if(!trusted(Uri.parse(web.getUrl()==null?"":web.getUrl())))return false;if(chooser!=null)chooser.onReceiveValue(null);chooser=callback;try{Intent pick=params.createIntent();pick.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(pick,FILE_PICK);}catch(Exception e){chooser.onReceiveValue(null);chooser=null;}return true;}
   @Override public boolean onCreateWindow(WebView v,boolean dialog,boolean gesture,Message result){if(!trusted(Uri.parse(web.getUrl()==null?"":web.getUrl())))return false;WebView child=new WebView(MainActivity.this);configure(child);popups.add(child);root.addView(child,new FrameLayout.LayoutParams(-1,-1));WebView.WebViewTransport transport=(WebView.WebViewTransport)result.obj;transport.setWebView(child);result.sendToTarget();return true;}
   @Override public void onCloseWindow(WebView child){closePopup(child);}
  });
  view.setDownloadListener((url,agent,disposition,mime,length)->{if(url.startsWith("https://")){try{android.app.DownloadManager.Request req=new android.app.DownloadManager.Request(Uri.parse(url));String cookies=CookieManager.getInstance().getCookie(url);if(cookies!=null)req.addRequestHeader("Cookie",cookies);req.addRequestHeader("User-Agent",agent);String name=URLUtil.guessFileName(url,disposition,mime);req.setTitle(name);req.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,name);((android.app.DownloadManager)getSystemService(DOWNLOAD_SERVICE)).enqueue(req);Toast.makeText(this,"Mengunduh "+name,Toast.LENGTH_SHORT).show();}catch(Exception e){Toast.makeText(this,"Unduhan belum berhasil. Coba melalui browser.",Toast.LENGTH_LONG).show();}}else Toast.makeText(this,"Coba unduh ulang dari tombol PDF atau simpan melalui cetak.",Toast.LENGTH_LONG).show();});
 }
 private boolean route(WebView source,Uri uri,boolean main){String scheme=uri.getScheme();boolean allowed=web!=null&&trusted(Uri.parse(web.getUrl()==null?"":web.getUrl()));
  if("jenius-print".equals(scheme)){if(main&&allowed){PrintManager manager=(PrintManager)getSystemService(PRINT_SERVICE);manager.print("Laporan Jenius Edu",source.createPrintDocumentAdapter("Jenius Edu"),null);}return true;}
  if("jenius-file".equals(scheme)){if(main&&allowed)saveBlob(uri);return true;}
  if(trusted(uri)||"about".equals(scheme)||"blob".equals(scheme))return false;
  if("https".equals(scheme)||"tel".equals(scheme)||"mailto".equals(scheme)||"whatsapp".equals(scheme)){try{Intent intent=new Intent(Intent.ACTION_VIEW,uri);intent.addCategory(Intent.CATEGORY_BROWSABLE);startActivity(intent);if(popups.contains(source))closePopup(source);}catch(Exception e){Toast.makeText(this,"Aplikasi untuk membuka tautan ini belum tersedia.",Toast.LENGTH_LONG).show();}return true;}
  return true;
 }
 private void saveBlob(Uri uri){try{String data=uri.getQueryParameter("data");if(data==null||data.length()>22*1024*1024)throw new IOException();pendingBytes=android.util.Base64.decode(data,android.util.Base64.DEFAULT);String name=uri.getQueryParameter("name"),type=uri.getQueryParameter("type");Intent save=new Intent(Intent.ACTION_CREATE_DOCUMENT);save.addCategory(Intent.CATEGORY_OPENABLE);save.setType(type==null?"application/octet-stream":type);save.putExtra(Intent.EXTRA_TITLE,name==null?"Jenius-Edu.pdf":name.replaceAll("[\\\\/]","_"));startActivityForResult(save,FILE_SAVE);}catch(Exception e){pendingBytes=null;Toast.makeText(this,"Berkas belum dapat disimpan. Coba melalui browser.",Toast.LENGTH_LONG).show();}}
 @Override protected void onActivityResult(int request,int result,Intent intent){super.onActivityResult(request,result,intent);if(request==FILE_PICK&&chooser!=null){Uri[] picked=WebChromeClient.FileChooserParams.parseResult(result,intent);if(picked!=null){for(Uri item:picked){if(item==null||!"content".equals(item.getScheme())){picked=null;break;}}}chooser.onReceiveValue(picked);chooser=null;}if(request==FILE_SAVE){byte[] bytes=pendingBytes;pendingBytes=null;if(result==RESULT_OK&&intent!=null&&intent.getData()!=null&&bytes!=null){try(OutputStream out=getContentResolver().openOutputStream(intent.getData())){if(out==null)throw new IOException();out.write(bytes);Toast.makeText(this,"Berkas berhasil disimpan.",Toast.LENGTH_SHORT).show();}catch(IOException e){Toast.makeText(this,"Berkas gagal disimpan.",Toast.LENGTH_LONG).show();}}}}
 private void closePopup(WebView child){if(child==null)return;root.removeView(child);popups.remove(child);child.destroy();}
 private void closeAllWeb(){for(WebView child:new ArrayList<>(popups))closePopup(child);if(web!=null){web.destroy();web=null;}}
 @Override public void onBackPressed(){if(!popups.isEmpty()){closePopup(popups.get(popups.size()-1));return;}if(web!=null){if(web.canGoBack())web.goBack();else super.onBackPressed();}else super.onBackPressed();}
 @Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);if(web!=null){state.putString("url",lastUrl);}}
 @Override protected void onPause(){super.onPause();CookieManager.getInstance().flush();}
 @Override protected void onDestroy(){if(chooser!=null)chooser.onReceiveValue(null);pendingBytes=null;closeAllWeb();super.onDestroy();}
}
