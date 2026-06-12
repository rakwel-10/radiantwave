# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore (cached) then publish
COPY RadiantWave.csproj ./
RUN dotnet restore RadiantWave.csproj
COPY . ./
RUN dotnet publish RadiantWave.csproj -c Release -o /app/publish /p:UseAppHost=false

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish ./

# Placeholder videos used to seed an empty (persistent) /videos on first boot.
COPY --from=build /src/videos/ /app/seed-videos/

ENV ASPNETCORE_ENVIRONMENT=Production
# Host platforms (Render/Railway) inject $PORT; the app binds to it. 8080 is the
# local-docker default.
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "RadiantWave.dll"]
