public class Search{public static List<List<SObject>> run(){return [FIND 'acme' IN ALL FIELDS RETURNING Account(Id,Name)];}}
