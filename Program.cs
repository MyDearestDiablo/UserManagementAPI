using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// For simple in-memory storage (replace with a database in production)
builder.Services.AddSingleton<UserRepository>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseRouting();

app.UseEndpoints(endpoints =>
{
    endpoints.MapControllers();
});

app.Run();

// User model and repository for demonstration purposes
public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Department { get; set; } = "";
}

public class UserRepository
{
    private readonly List<User> _users = new();
    private int _nextId = 1;

    public IEnumerable<User> GetAll() => _users;
    public User? Get(int id) => _users.FirstOrDefault(u => u.Id == id);
    public User Add(User user)
    {
        user.Id = _nextId++;
        _users.Add(user);
        return user;
    }
    public bool Update(int id, User updated)
    {
        var user = Get(id);
        if (user == null) return false;
        user.Name = updated.Name;
        user.Email = updated.Email;
        user.Department = updated.Department;
        return true;
    }
    public bool Delete(int id)
    {
        var user = Get(id);
        if (user == null) return false;
        _users.Remove(user);
        return true;
    }
}