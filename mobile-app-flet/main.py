import flet as ft
from flet import icons, Colors
import asyncio
import os
from api_service import APIService

DEFAULT_BASE_URL = "http://localhost:8000"

class EmergencyMobileApp:
    def __init__(self, page: ft.Page):
        self.page = page
        self.page.title = "Emergency Response Mobile"
        self.page.theme_mode = ft.ThemeMode.DARK
        self.page.padding = 0
        self.page.spacing = 0
        self.page.window_width = 390
        self.page.window_height = 844 
        self.page.window_resizable = False
        
        self.primary_color = ft.Colors.BLUE_ACCENT_700
        self.accent_color = ft.Colors.AMBER_400
        self.bg_color = ft.Colors.BLACK
        self.surface_color = "#121212"
        
        self.api = APIService(DEFAULT_BASE_URL)
        
        # State
        self.user_data = None
        self.active_alert = None
        self.is_available = True

        self.setup_ui()

    def setup_ui(self):
        self.show_login()

    def show_login(self):
        self.page.appbar = None
        self.page.clean()
        self.page.add(self.build_login_view())
        self.page.update()

    def build_login_view(self):
        self.team_id_input = ft.TextField(
            label="Team ID", 
            prefix_icon=icons.Icons.PERSON_OUTLINE,
            border_radius=12,
            border_color=ft.Colors.GREY_700,
            focused_border_color=self.primary_color,
            cursor_color=self.primary_color,
            text_size=16
        )
        self.password_input = ft.TextField(
            label="Password", 
            password=True, 
            can_reveal_password=True, 
            prefix_icon=icons.Icons.LOCK_OUTLINE,
            border_radius=12,
            border_color=ft.Colors.GREY_700,
            focused_border_color=self.primary_color,
            cursor_color=self.primary_color,
            text_size=16
        )
        self.base_url_input = ft.TextField(
            label="Server URL", 
            value=DEFAULT_BASE_URL,
            prefix_icon=icons.Icons.LINK,
            border_radius=12,
            border_color=ft.Colors.GREY_700,
            focused_border_color=self.primary_color,
            cursor_color=self.primary_color,
            text_size=14
        )
        
        return ft.Container(
            content=ft.Column(
                [
                    ft.Container(height=60), # Spacer
                    ft.Icon(icons.Icons.LOCAL_HOSPITAL, color=ft.Colors.RED_ACCENT_400, size=80),
                    ft.Text("RESPONDER", size=32, weight=ft.FontWeight.BOLD),
                    ft.Text("Secure Access Portal", size=14, color=ft.Colors.GREY_400),
                    ft.Container(height=40), # Spacer
                    ft.Card(
                        content=ft.Container(
                            content=ft.Column([
                                self.base_url_input,
                                self.team_id_input,
                                self.password_input,
                                ft.Container(height=10),
                                ft.FilledButton(
                                    "SIGN IN", 
                                    on_click=self.handle_login,
                                    style=ft.ButtonStyle(
                                        color=ft.Colors.WHITE,
                                        bgcolor=self.primary_color,
                                        padding=24,
                                        shape=ft.RoundedRectangleBorder(radius=12)
                                    ),
                                    width=float("inf")
                                ),
                            ], spacing=15),
                            padding=24,
                        ),
                        elevation=10,
                        bgcolor=self.surface_color,
                    ),
                    ft.Container(expand=True),
                    ft.Text("Portable Device Emergency System v2.0", size=10, color=ft.Colors.GREY_600),
                    ft.Container(height=20)
                ],
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            ),
            padding=30,
            expand=True,
            gradient=ft.LinearGradient(
                begin=ft.Alignment(0, -1),
                end=ft.Alignment(0, 1),
                colors=[self.surface_color, self.bg_color]
            )
        )

    async def handle_login(self, e):
        self.api.base_url = self.base_url_input.value.rstrip('/')
        self.api.ws_url = self.api.base_url.replace('https://', 'wss://').replace('http://', 'ws://')
        
        self.page.splash = ft.ProgressBar(color=self.primary_color)
        self.page.update()

        result = await self.api.login(self.team_id_input.value, self.password_input.value)
        
        self.page.splash = None
        if "error" in result:
            self.show_snackbar(f"Login Failed: {result['error']}", ft.Colors.RED_400)
        else:
            self.user_data = result["user"]
            self.show_snackbar("Authentication Successful", ft.Colors.GREEN_400)
            self.api.start_websocket(self.on_new_alert)
            self.show_dashboard()
        
        self.page.update()

    def show_dashboard(self):
        self.page.clean()
        self.page.appbar = ft.AppBar(
            title=ft.Text("DASHBOARD", weight=ft.FontWeight.BOLD, size=16),
            center_title=True,
            bgcolor=self.surface_color,
            actions=[
                ft.IconButton(icons.Icons.PERSON_ROUNDED, on_click=lambda _: None),
            ],
            leading=ft.Icon(icons.Icons.SHIELD_ROUNDED, color=self.primary_color)
        )
        
        self.dashboard_view = self.build_dashboard_view()
        self.page.add(self.dashboard_view)
        self.update_status_ui()
        self.page.update()

    def build_dashboard_view(self):
        self.status_text = ft.Text("AVAILABLE", weight=ft.FontWeight.BOLD, color=ft.Colors.GREEN_400)
        self.status_icon = ft.Icon(icons.Icons.CIRCLE, color=ft.Colors.GREEN_400, size=12)
        
        self.status_container = ft.Container(
            content=ft.Row([
                self.status_icon,
                self.status_text,
                ft.Container(expand=True),
                ft.Switch(value=True, on_change=self.toggle_status, active_color=ft.Colors.GREEN_400)
            ]),
            padding=15,
            bgcolor=self.surface_color,
            border_radius=15,
            margin=ft.margin.only(bottom=20)
        )
        
        self.alert_list = ft.Column(
            [ft.Container(
                content=ft.Column([
                    ft.Icon(icons.Icons.NOTIFICATIONS_OFF_OUTLINED, size=40, color=ft.Colors.GREY_700),
                    ft.Text("No Active Alerts", color=ft.Colors.GREY_600)
                ], horizontal_alignment=ft.CrossAxisAlignment.CENTER),
                alignment=ft.alignment.center,
                padding=40
            )],
            spacing=15,
            scroll=ft.ScrollMode.ADAPTIVE
        )

        return ft.Container(
            content=ft.Column(
                [
                    self.status_container,
                    ft.Row([
                        ft.Text("LIVE ALERTS", size=14, weight=ft.FontWeight.BOLD, color=ft.Colors.GREY_500),
                        ft.Container(expand=True),
                        ft.Text("RECENT", size=12, color=self.primary_color)
                    ]),
                    ft.Divider(height=1, color=ft.Colors.GREY_800),
                    self.alert_list,
                    ft.Container(expand=True),
                    ft.Container(
                        content=ft.Row([
                            ft.Column([
                                ft.Text(self.user_data['name'] if self.user_data else "Unknown Team", size=14, weight=ft.FontWeight.BOLD),
                                ft.Text(f"ID: {self.user_data['team_id'] if self.user_data else ''}", size=11, color=ft.Colors.GREY_500),
                            ]),
                            ft.Container(expand=True),
                            ft.IconButton(icons.Icons.LOGOUT_ROUNDED, icon_color=ft.Colors.RED_400, on_click=lambda _: self.show_login())
                        ]),
                        padding=15,
                        bgcolor=self.surface_color,
                        border_radius=ft.border_radius.only(top_left=20, top_right=20)
                    )
                ],
                expand=True
            ),
            padding=ft.padding.only(left=20, right=20, top=20),
            expand=True
        )

    def on_new_alert(self, alert_data):
        self.active_alert = alert_data
        self.alert_list.controls.clear()
        
        alert_card = ft.Card(
            content=ft.Container(
                content=ft.Column([
                    ft.Row([
                        ft.Container(
                            content=ft.Icon(icons.Icons.WARNING_ROUNDED, color=ft.Colors.BLACK, size=20),
                            bgcolor=self.accent_color,
                            padding=5,
                            border_radius=5
                        ),
                        ft.Text("EMERGENCY ALERT", weight=ft.FontWeight.BOLD, color=self.accent_color),
                    ]),
                    ft.Divider(height=1, color=ft.Colors.GREY_800),
                    ft.Text(f"Coordinates: {alert_data['alert_lat']}, {alert_data['alert_lng']}", size=14),
                    ft.Text(f"Type: {alert_data['status']}", size=14, italic=True),
                    ft.Row([
                        ft.FilledButton(
                            "ACCEPT", 
                            bgcolor=ft.Colors.GREEN_600, 
                            color=ft.Colors.WHITE, 
                            width=120,
                            on_click=lambda _: self.accept_alert(alert_data['id'])
                        ),
                        ft.TextButton("DISMISS", color=ft.Colors.GREY_500)
                    ], alignment=ft.MainAxisAlignment.END)
                ], spacing=12),
                padding=15,
            ),
            bgcolor=self.surface_color,
            elevation=4
        )
        
        self.alert_list.controls.append(alert_card)
        self.page.update()

    async def accept_alert(self, alert_id):
        await self.api.accept_alert(alert_id)
        self.active_alert['is_accepted'] = True
        self.is_available = False
        
        self.alert_list.controls.clear()
        self.alert_list.controls.append(
            ft.Card(
                content=ft.Container(
                    content=ft.Column([
                        ft.Row([
                            ft.Icon(icons.Icons.RUN_CIRCLE, color=ft.Colors.GREEN_400),
                            ft.Text("MISSION ACTIVE", weight=ft.FontWeight.BOLD, color=ft.Colors.GREEN_400),
                        ]),
                        ft.Text("Navigate to incident site immediately.", size=13),
                        ft.FilledButton(
                            "MARK AS RESOLVED", 
                            bgcolor=self.primary_color, 
                            color=ft.Colors.WHITE, 
                            width=float("inf"),
                            on_click=lambda _: self.resolve_alert(alert_id)
                        )
                    ], spacing=15),
                    padding=20,
                ),
                bgcolor=self.surface_color
            )
        )
        self.update_status_ui()
        self.page.update()

    async def resolve_alert(self, alert_id):
        await self.api.complete_alert(alert_id)
        self.active_alert = None
        self.is_available = True
        self.alert_list.controls.clear()
        self.alert_list.controls.append(
            ft.Container(
                content=ft.Column([
                    ft.Icon(icons.Icons.CHECK_CIRCLE_OUTLINE, size=40, color=ft.Colors.GREEN_900),
                    ft.Text("Ready for next mission", color=ft.Colors.GREY_600)
                ], horizontal_alignment=ft.CrossAxisAlignment.CENTER),
                alignment=ft.alignment.center,
                padding=40
            )
        )
        self.update_status_ui()
        self.page.update()

    def toggle_status(self, e):
        self.is_available = e.control.value
        asyncio.create_task(self.api.update_status(self.is_available))
        self.update_status_ui()
        self.page.update()

    def update_status_ui(self):
        if self.is_available:
            self.status_text.value = "AVAILABLE"
            self.status_text.color = ft.Colors.GREEN_400
            self.status_icon.color = ft.Colors.GREEN_400
        else:
            self.status_text.value = "BUSY / ON MISSION"
            self.status_text.color = ft.Colors.RED_400
            self.status_icon.color = ft.Colors.RED_400

    def show_snackbar(self, message, color):
        self.page.snack_bar = ft.SnackBar(ft.Text(message), bgcolor=color)
        self.page.snack_bar.open = True

def main(page: ft.Page):
    EmergencyMobileApp(page)

if __name__ == "__main__":
    ft.run(main)
