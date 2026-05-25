public class AnnotationCommentBoundary {
  @AuraEnabled(
    cacheable=true /* annotation note: keep this ) and ; untouched */
  )
  public static Account loadOne() {
    Account row=[SELECT Id,Name FROM Account LIMIT 1];
    return row;
  }
}
