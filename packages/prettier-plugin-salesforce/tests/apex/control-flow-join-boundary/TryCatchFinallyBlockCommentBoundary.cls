public class TryCatchFinallyBlockCommentBoundary {
  public void run() {
    try {
      work();
    }
    /* boundary comment between try and catch */
    catch (Exception ex) {
      System.debug(ex.getMessage());
    }
    /* boundary comment between catch and finally */
    finally {
      System.debug('done');
    }
  }
}
