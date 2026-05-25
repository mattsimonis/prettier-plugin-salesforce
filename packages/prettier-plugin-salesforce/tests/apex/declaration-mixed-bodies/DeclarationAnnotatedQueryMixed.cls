public class DeclarationAnnotatedQueryMixed {
  // attached annotation + query declaration
  @TestVisible
  private static Account cached =
    [SELECT Id, Name FROM Account LIMIT 1];

  // attached comment + annotation + plain declaration
  /** marker */
  @TestVisible
  private static Integer seen = 0;
}
