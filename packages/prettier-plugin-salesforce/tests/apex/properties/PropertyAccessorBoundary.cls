public class PropertyAccessorBoundary {
  private Account cached;
  public Account Primary {
    get {
      if (cached == null) {
        // query in accessor body
        cached = [SELECT Id, Name FROM Account WHERE Name = 'A;B' LIMIT 1];
      }
      return cached;
    }
    private set {
      if (value == null) {
        cached = null;
      } else {
        cached = value.clone(false);
      }
    }
  }
}
