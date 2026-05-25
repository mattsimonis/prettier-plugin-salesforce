public class MultiCatchSpacing{
public static void run(Boolean enabled){
try{if(enabled){work();}else{fallback();}}
catch(Exception|DmlException ex){System.debug(ex.getMessage());}
finally{System.debug('done');}
}
}
