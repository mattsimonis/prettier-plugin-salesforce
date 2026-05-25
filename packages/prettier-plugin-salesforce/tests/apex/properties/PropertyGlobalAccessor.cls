public class PropertyGlobalAccessor {
  private Account cached;
  public Account Primary {
    global get {
      if (cached == null) {
        cached = [SELECT Id, Name FROM Account WHERE Id = :value LIMIT 1];
      }
      return cached;
    }
    global set {
      if (value == null) {
        cached = null;
      } else {
        cached = value;
      }
    }
  }
}
