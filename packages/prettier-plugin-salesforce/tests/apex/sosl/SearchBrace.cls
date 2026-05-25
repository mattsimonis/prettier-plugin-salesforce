public class SearchBrace{public static List<List<SObject>> run(){return [FIND {Acme*} IN ALL FIELDS RETURNING Account(Id,Name)];}}
